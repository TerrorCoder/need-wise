import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeChannel3Response, searchChannel3 } from '../worker/services/channel3';

afterEach(() => vi.restoreAllMocks());

const product = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  title: 'USB study lamp',
  description: 'A useful lamp',
  category: { title: 'Study' },
  images: [{ url: 'https://img.example/lamp.jpg', is_main_image: true }],
  offers: [{ url: 'https://shop.example/lamp', domain: 'shop.example', price: { amount: 19.99, currency: 'USD' }, availability: 'InStock' }],
  ...overrides
});

describe('Channel3 integration', () => {
  it('normalizes products and keeps retailer information', () => {
    const result = normalizeChannel3Response({ products: [product()] });
    expect(result.products[0]).toMatchObject({ id: 'channel3-p-1', priceCents: 1999, merchant: 'shop.example', productUrl: 'https://shop.example/lamp', source: 'channel3' });
  });
  it('selects the cheapest valid in-stock USD offer', () => {
    const result = normalizeChannel3Response({ products: [product({ offers: [
      { url: 'https://sold.example/lamp', domain: 'sold.example', price: { amount: 9, currency: 'USD' }, availability: 'OutOfStock' },
      { url: 'https://costly.example/lamp', domain: 'costly.example', price: { amount: 30, currency: 'USD' }, availability: 'InStock' },
      { url: 'https://best.example/lamp', domain: 'best.example', price: { amount: 18, currency: 'USD' }, availability: 'InStock' }
    ] })] });
    expect(result.products[0]).toMatchObject({ priceCents: 1800, merchant: 'best.example', availability: 'InStock' });
  });
  it('rejects unsafe retailer and image URLs', () => {
    const result = normalizeChannel3Response({ products: [product({ images: [{ url: 'javascript:alert(1)' }], offers: [{ url: 'javascript:alert(1)', domain: 'unsafe', price: { amount: 10, currency: 'USD' }, availability: 'InStock' }] })] });
    expect(result.products).toEqual([]);
  });
  it('skips missing prices, malformed products, and duplicate IDs', () => {
    const result = normalizeChannel3Response({ products: [product(), product(), product({ id: 'no-price', offers: [] }), null] });
    expect(result.products).toHaveLength(1);
    expect(result.skipped).toBe(3);
  });
  it('maps authentication and rate-limit failures explicitly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(searchChannel3('bad', 'lamp', 5000)).rejects.toMatchObject({ status: 502 });
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 429 }));
    await expect(searchChannel3('bad', 'lamp', 5000)).rejects.toMatchObject({ status: 429 });
  });
  it('rejects malformed responses and unavailable credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 200 }));
    await expect(searchChannel3('key', 'new lamp', 5000)).rejects.toThrow('malformed JSON');
    await expect(searchChannel3(undefined, 'lamp', 5000)).rejects.toThrow('not configured');
  });
});
