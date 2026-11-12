import type { Env, Product } from '../types';
import { sumProducts } from './budget';
import { groupRetailerAllocation } from './basket';

type PayPalEnv = Pick<Env, 'PAYPAL_CLIENT_ID' | 'PAYPAL_CLIENT_SECRET' | 'PAYPAL_ENVIRONMENT' | 'APP_URL'>;
export class ProviderError extends Error { constructor(message: string, public status = 502) { super(message); } }

const baseUrl = 'https://api-m.sandbox.paypal.com';

async function token(env: PayPalEnv) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new ProviderError('PayPal Sandbox is not configured.', 503);
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!response.ok) throw new ProviderError('PayPal authentication failed.');
  const data = await response.json<{ access_token?: string }>();
  if (!data.access_token) throw new ProviderError('PayPal returned no access token.');
  return data.access_token;
}

async function paypalFetch(env: PayPalEnv, path: string, init: RequestInit = {}) {
  const accessToken = await token(env);
  return fetch(`${baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init.headers } });
}

export async function createPayPalOrder(env: PayPalEnv, products: Product[]) {
  const value = (sumProducts(products) / 100).toFixed(2);
  const response = await paypalFetch(env, '/v2/checkout/orders', { method: 'POST', headers: { 'PayPal-Request-Id': crypto.randomUUID() }, body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ reference_id: 'needwise-basket', description: `NeedWise demonstration basket (${products.length} items)`, amount: { currency_code: 'USD', value, breakdown: { item_total: { currency_code: 'USD', value } } }, items: products.map((product) => ({ name: product.name.slice(0, 127), quantity: '1', unit_amount: { currency_code: 'USD', value: (product.priceCents / 100).toFixed(2) }, category: 'PHYSICAL_GOODS', sku: product.id })) }], payment_source: { paypal: { experience_context: { brand_name: 'NeedWise', landing_page: 'LOGIN', user_action: 'PAY_NOW', return_url: `${env.APP_URL}/?payment=return`, cancel_url: `${env.APP_URL}/?payment=cancelled` } } } }) });
  const data = await response.json<Record<string, unknown>>();
  if (!response.ok) throw new ProviderError('PayPal could not create the order.');
  const links = Array.isArray(data.links) ? data.links as Array<{ rel?: string; href?: string }> : [];
  const approveUrl = links.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href;
  if (typeof data.id !== 'string' || !approveUrl) throw new ProviderError('PayPal returned an incomplete order.');
  return { orderId: data.id, approveUrl, amount: value, totalCents: sumProducts(products), currency: 'USD' as const, allocation: groupRetailerAllocation(products) };
}

function cents(value: unknown) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return undefined;
  const [dollars, fraction] = value.split('.');
  const amount = Number(dollars) * 100 + Number(fraction);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

function capturedTotal(data: Record<string, unknown>) {
  const units = Array.isArray(data.purchase_units) ? data.purchase_units as Array<Record<string, unknown>> : [];
  let total = 0;
  let found = false;
  for (const unit of units) {
    const payments = unit.payments && typeof unit.payments === 'object' ? unit.payments as Record<string, unknown> : {};
    const captures = Array.isArray(payments.captures) ? payments.captures as Array<Record<string, unknown>> : [];
    for (const capture of captures) {
      if (capture.status !== 'COMPLETED' || !capture.amount || typeof capture.amount !== 'object') continue;
      const amount = capture.amount as Record<string, unknown>;
      if (amount.currency_code !== 'USD') throw new ProviderError('PayPal returned an unexpected capture currency.');
      const amountCents = cents(amount.value);
      if (amountCents === undefined) throw new ProviderError('PayPal returned an invalid capture amount.');
      total += amountCents;
      found = true;
    }
  }
  if (!found || !Number.isSafeInteger(total)) throw new ProviderError('PayPal did not return a verified capture amount.');
  return total;
}

export async function capturePayPalOrder(env: PayPalEnv, orderId: string) {
  const response = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', headers: { 'PayPal-Request-Id': `needwise-capture-${orderId}` } });
  const data = await response.json<Record<string, unknown>>();
  if (response.ok) return { orderId, status: data.status, captured: data.status === 'COMPLETED', amountCents: data.status === 'COMPLETED' ? capturedTotal(data) : undefined, currency: 'USD' as const };
  const existing = await paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
  const order = await existing.json<Record<string, unknown>>();
  if (existing.ok && order.status === 'COMPLETED') return { orderId, status: 'COMPLETED', captured: true, duplicate: true, amountCents: capturedTotal(order), currency: 'USD' as const };
  throw new ProviderError('PayPal could not capture this order.');
}
