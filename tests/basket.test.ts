import { describe, expect, it } from 'vitest';
import { BasketError, groupRetailerAllocation, issueBasketSnapshot, verifyBasketSnapshot } from '../worker/services/basket';
import type { Product } from '../worker/types';

const secret = 'test-signing-secret-with-at-least-32-characters';
const product = (id: string, merchant: string, priceCents: number): Product => ({
  id, merchant, priceCents, name: `Product ${id}`, description: 'Verified listing', category: 'test', source: 'channel3', attributes: { durability: 3, portability: 3, value: 3 }
});
const products = [product('one', 'Retailer A', 1800), product('two', 'Retailer B', 2700), product('three', 'Retailer A', 1500)];

describe('authenticated live basket snapshots', () => {
  it('supports one retailer, multiple retailers, and grouping repeated retailers', async () => {
    const signed = await issueBasketSnapshot(secret, products, 7500, 1_000);
    const oneRetailer = await verifyBasketSnapshot(secret, signed.token, ['one', 'three'], 2_000);
    expect(groupRetailerAllocation(oneRetailer)).toEqual([{ merchant: 'Retailer A', amountCents: 3300 }]);
    const multiple = await verifyBasketSnapshot(secret, signed.token, ['one', 'two', 'three'], 2_000);
    expect(groupRetailerAllocation(multiple)).toEqual([{ merchant: 'Retailer A', amountCents: 3300 }, { merchant: 'Retailer B', amountCents: 2700 }]);
    expect(groupRetailerAllocation(multiple).reduce((sum, entry) => sum + entry.amountCents, 0)).toBe(6000);
  });

  it('allows removal and replacement only from the authenticated candidate set', async () => {
    const signed = await issueBasketSnapshot(secret, products, 7500, 1_000);
    await expect(verifyBasketSnapshot(secret, signed.token, ['one'], 2_000)).resolves.toMatchObject([{ id: 'one', priceCents: 1800 }]);
    await expect(verifyBasketSnapshot(secret, signed.token, ['three'], 2_000)).resolves.toMatchObject([{ id: 'three', priceCents: 1500 }]);
    await expect(verifyBasketSnapshot(secret, signed.token, ['invented'], 2_000)).rejects.toThrow('not in the approved live basket');
  });

  it('rejects tampering, duplicate IDs, and expired snapshots', async () => {
    const signed = await issueBasketSnapshot(secret, products, 7500, 1_000);
    const [payload, signature] = signed.token.split('.');
    const tampered = `${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}.${signature}`;
    await expect(verifyBasketSnapshot(secret, tampered, ['one'], 2_000)).rejects.toThrow(BasketError);
    await expect(verifyBasketSnapshot(secret, signed.token, ['one', 'one'], 2_000)).rejects.toThrow('duplicate');
    await expect(verifyBasketSnapshot(secret, signed.token, ['one'], signed.expiresAt)).rejects.toThrow('expired');
  });
});
