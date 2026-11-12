import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoCatalogue } from '../worker/data/catalog';
import { capturePayPalOrder, createPayPalOrder, ProviderError } from '../worker/services/paypal';

const env = { PAYPAL_CLIENT_ID: 'client', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_ENVIRONMENT: 'sandbox' as const, APP_URL: 'https://example.com' };
afterEach(() => vi.restoreAllMocks());

describe('PayPal checkout', () => {
  it('calculates the amount from server products', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'ORDER12345', links: [{ rel: 'payer-action', href: 'https://www.sandbox.paypal.com/approve' }] }), { status: 201 }));
    const result = await createPayPalOrder(env, demoCatalogue.slice(0, 2));
    const request = fetchMock.mock.calls[1][1];
    const payload = JSON.parse(String(request?.body));
    expect(payload.purchase_units[0].amount.value).toBe('33.98');
    expect(payload.purchase_units[0].items.map((item: { unit_amount: { value: string } }) => item.unit_amount.value)).toEqual(['18.99', '14.99']);
    expect(result.orderId).toBe('ORDER12345');
    expect(result.totalCents).toBe(3398);
    expect(result.allocation).toEqual([{ merchant: 'NeedWise demo merchant', amountCents: 3398 }]);
  });
  it('handles provider failures without leaking details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(createPayPalOrder(env, demoCatalogue.slice(0, 1))).rejects.toThrow(ProviderError);
  });
  it('treats an already-completed duplicate capture as success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 422 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: '18.99' } }] } }] }), { status: 200 }));
    await expect(capturePayPalOrder(env, 'ORDER12345')).resolves.toMatchObject({ captured: true, duplicate: true, amountCents: 1899 });
  });
  it('returns the verified captured amount for a successful payment', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: '60.00' } }] } }] }), { status: 201 }));
    await expect(capturePayPalOrder(env, 'ORDER12345')).resolves.toMatchObject({ captured: true, amountCents: 6000, currency: 'USD' });
  });
});
