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
    expect(result.orderId).toBe('ORDER12345');
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
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'COMPLETED' }), { status: 200 }));
    await expect(capturePayPalOrder(env, 'ORDER12345')).resolves.toMatchObject({ captured: true, duplicate: true });
  });
});
