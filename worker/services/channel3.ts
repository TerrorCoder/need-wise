import type { Product } from '../types';

const endpoint = 'https://api.trychannel3.com/v1/search';
const cacheTtlMs = 60_000;
const cache = new Map<string, { expiresAt: number; products: Product[] }>();

export class Channel3Error extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

type Channel3Image = { url?: unknown; cleaned_url?: unknown; is_main_image?: unknown };
type Channel3Offer = {
  url?: unknown;
  domain?: unknown;
  price?: { price?: unknown; currency?: unknown; availability?: unknown } | null;
};
type Channel3Product = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  category?: { title?: unknown } | null;
  images?: Channel3Image[];
  key_features?: unknown;
  offers?: Channel3Offer[];
};

export interface NormalizedChannel3Result {
  products: Product[];
  skipped: number;
}

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function firstImage(images: unknown) {
  if (!Array.isArray(images)) return undefined;
  const image = images.find((item) => item && typeof item === 'object' && (item as Channel3Image).is_main_image === true) ?? images[0];
  if (!image || typeof image !== 'object') return undefined;
  const candidate = text((image as Channel3Image).cleaned_url) || text((image as Channel3Image).url);
  return candidate || undefined;
}

function normalizeOffer(offer: unknown) {
  if (!offer || typeof offer !== 'object') return undefined;
  const value = offer as Channel3Offer;
  const price = value.price;
  if (!price || typeof price !== 'object' || text(price.currency).toUpperCase() !== 'USD' || typeof price.price !== 'number' || !Number.isFinite(price.price) || price.price < 0) return undefined;
  const cents = Math.round(price.price * 100);
  if (!Number.isSafeInteger(cents)) return undefined;
  const url = text(value.url);
  if (!url) return undefined;
  return { cents, url, domain: text(value.domain) || 'Retailer', availability: text(price.availability) || 'Unknown' };
}

export function normalizeChannel3Response(payload: unknown): NormalizedChannel3Result {
  const products = payload && typeof payload === 'object' && Array.isArray((payload as { products?: unknown }).products) ? (payload as { products: Channel3Product[] }).products : null;
  if (!products) throw new Channel3Error('Channel3 returned an invalid product response.', 502);
  const seen = new Set<string>();
  const normalized: Product[] = [];
  let skipped = 0;
  for (const raw of products) {
    const id = text(raw?.id);
    const name = text(raw?.title);
    const offer = Array.isArray(raw?.offers) ? raw.offers.map(normalizeOffer).find(Boolean) : undefined;
    if (!id || !name || !offer || seen.has(id)) {
      skipped++;
      continue;
    }
    seen.add(id);
    const category = raw.category && typeof raw.category === 'object' ? text(raw.category.title) : '';
    const features = Array.isArray(raw.key_features) ? raw.key_features.filter((item): item is string => typeof item === 'string').slice(0, 5) : [];
    normalized.push({
      id: `channel3-${id}`,
      name,
      description: text(raw.description) || features.join(', ') || 'Product details supplied by Channel3.',
      priceCents: offer.cents,
      category: category || 'catalogue',
      merchant: offer.domain,
      source: 'channel3',
      imageUrl: firstImage(raw.images),
      productUrl: offer.url,
      availability: offer.availability,
      attributes: { durability: 3, portability: 3, value: offer.cents > 0 ? 3 : 2 }
    });
  }
  return { products: normalized, skipped };
}

export async function searchChannel3(apiKey: string | undefined, query: string, budgetCents: number): Promise<NormalizedChannel3Result> {
  if (!apiKey) throw new Channel3Error('Live catalogue search is not configured. Add CHANNEL3_API_KEY to the Worker.', 503);
  const key = `${query.toLowerCase()}|${budgetCents}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { products: cached.products, skipped: 0 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, filters: { price: { max_price: budgetCents / 100 }, availability: ['InStock', 'LimitedAvailability'] }, limit: 20 }),
      signal: controller.signal
    });
    if (response.status === 401 || response.status === 403) throw new Channel3Error('Channel3 authentication failed. Check CHANNEL3_API_KEY.', 502);
    if (response.status === 429) throw new Channel3Error('Channel3 search credits or rate limit are exhausted. Try again shortly.', 429);
    if (!response.ok) throw new Channel3Error(response.status >= 500 ? 'Channel3 is temporarily unavailable.' : 'Channel3 could not complete this search.', 502);
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new Channel3Error('Channel3 returned malformed JSON.', 502); }
    const result = normalizeChannel3Response(payload);
    cache.set(key, { expiresAt: Date.now() + cacheTtlMs, products: result.products });
    return result;
  } catch (error) {
    if (error instanceof Channel3Error) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new Channel3Error('Channel3 search timed out. Try again.', 504);
    throw new Channel3Error('Channel3 is unavailable right now.', 502);
  } finally {
    clearTimeout(timeout);
  }
}
