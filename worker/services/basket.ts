import type { Product } from '../types';
import { sumProducts } from './budget';

const encoder = new TextEncoder();
const snapshotLifetimeMs = 15 * 60 * 1000;

export class BasketError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface RetailerAllocation { merchant: string; amountCents: number }

interface SnapshotProduct {
  id: string;
  name: string;
  merchant: string;
  priceCents: number;
  source: 'channel3';
}

interface BasketSnapshot {
  version: 1;
  expiresAt: number;
  budgetCents: number;
  products: SnapshotProduct[];
}

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function signingKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

function snapshotProduct(product: Product): SnapshotProduct {
  return { id: product.id, name: product.name.slice(0, 127), merchant: product.merchant.slice(0, 120), priceCents: product.priceCents, source: 'channel3' };
}

function isSnapshot(value: unknown): value is BasketSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<BasketSnapshot>;
  return snapshot.version === 1 && Number.isSafeInteger(snapshot.expiresAt) && Number.isSafeInteger(snapshot.budgetCents) && (snapshot.budgetCents ?? 0) >= 100 && Array.isArray(snapshot.products) && snapshot.products.length >= 1 && snapshot.products.length <= 20 && snapshot.products.every((product) => product && typeof product.id === 'string' && product.id.length >= 1 && product.id.length <= 300 && typeof product.name === 'string' && product.name.length >= 1 && product.name.length <= 127 && typeof product.merchant === 'string' && product.merchant.length >= 1 && product.merchant.length <= 120 && Number.isSafeInteger(product.priceCents) && product.priceCents > 0 && product.source === 'channel3');
}

export function groupRetailerAllocation(products: Pick<Product, 'merchant' | 'priceCents'>[]): RetailerAllocation[] {
  const totals = new Map<string, number>();
  for (const product of products) totals.set(product.merchant, (totals.get(product.merchant) ?? 0) + product.priceCents);
  return [...totals].map(([merchant, amountCents]) => ({ merchant, amountCents })).sort((a, b) => a.merchant.localeCompare(b.merchant));
}

export async function issueBasketSnapshot(secret: string | undefined, products: Product[], budgetCents: number, now = Date.now()) {
  if (!secret || secret.length < 32) throw new BasketError('Live checkout signing is not configured.', 503);
  const unique = [...new Map(products.filter((product) => product.source === 'channel3').map((product) => [product.id, product])).values()];
  if (!unique.length || unique.length > 20) throw new BasketError('The live basket cannot be prepared for checkout.');
  const payload: BasketSnapshot = { version: 1, expiresAt: now + snapshotLifetimeMs, budgetCents, products: unique.map(snapshotProduct) };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await signingKey(secret, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload)));
  return { token: `${encodedPayload}.${toBase64Url(signature)}`, expiresAt: payload.expiresAt };
}

export async function verifyBasketSnapshot(secret: string | undefined, token: string, productIds: string[], now = Date.now()): Promise<Product[]> {
  if (!secret || secret.length < 32) throw new BasketError('Live checkout signing is not configured.', 503);
  if (typeof token !== 'string' || token.length > 16_000) throw new BasketError('The live checkout snapshot is invalid. Please run the search again.');
  if (!Array.isArray(productIds) || productIds.length < 1 || productIds.length > 20 || productIds.some((id) => typeof id !== 'string')) throw new BasketError('Choose between 1 and 20 products.');
  if (new Set(productIds).size !== productIds.length) throw new BasketError('The basket contains duplicate products.');
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) throw new BasketError('The live checkout snapshot is invalid. Please run the search again.');
  try {
    const key = await signingKey(secret, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, fromBase64Url(encodedSignature), encoder.encode(encodedPayload));
    if (!valid) throw new BasketError('The live checkout snapshot was modified. Please run the search again.');
    const snapshot: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload)));
    if (!isSnapshot(snapshot)) throw new BasketError('The live checkout snapshot is invalid. Please run the search again.');
    if (snapshot.expiresAt <= now) throw new BasketError('The live checkout snapshot has expired. Please refresh the recommendations.');
    const catalogue = new Map(snapshot.products.map((product) => [product.id, product]));
    const selected = productIds.map((id) => catalogue.get(id));
    if (selected.some((product) => !product)) throw new BasketError('One or more selected products are not in the approved live basket.');
    const products: Product[] = (selected as SnapshotProduct[]).map((product) => ({ ...product, description: 'Authenticated Channel3 checkout item.', category: 'live catalogue', attributes: { durability: 3, portability: 3, value: 3 } }));
    if (sumProducts(products) > snapshot.budgetCents) throw new BasketError('The selected basket exceeds its confirmed budget.');
    return products;
  } catch (error) {
    if (error instanceof BasketError) throw error;
    throw new BasketError('The live checkout snapshot is invalid. Please run the search again.');
  }
}
