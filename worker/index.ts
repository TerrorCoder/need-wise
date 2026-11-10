import { demoCatalogue, findProducts } from './data/catalog';
import { createPayPalOrder, capturePayPalOrder, ProviderError } from './services/paypal';
import { recommend } from './services/recommendations';
import type { CheckoutRequest, Env, Priority, RecommendationRequest } from './types';

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const securityHeaders = { 'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://www.sandbox.paypal.com", 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Frame-Options': 'DENY' };

const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: jsonHeaders });

async function body<T>(request: Request): Promise<T> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 16_384) throw new Response('Request too large', { status: 413 });
  const text = await request.text();
  if (text.length > 16_384) throw new Response('Request too large', { status: 413 });
  try { return JSON.parse(text) as T; } catch { throw new Response('Invalid JSON', { status: 400 }); }
}

function recommendationInput(value: RecommendationRequest) {
  const allowed: Priority[] = ['affordability', 'durability', 'portability'];
  if (!Number.isSafeInteger(value.budgetCents) || value.budgetCents < 100 || value.budgetCents > 1_000_000) return 'Budget must be between $1 and $10,000.';
  if (typeof value.requirements !== 'string' || value.requirements.trim().length < 3 || value.requirements.length > 500) return 'Describe what you need in 3 to 500 characters.';
  if (!Array.isArray(value.priorities) || value.priorities.some((item) => !allowed.includes(item))) return 'Choose only supported priorities.';
}

async function api(request: Request, env: Env, url: URL) {
  if (request.method === 'GET' && url.pathname === '/api/status') return reply({ catalogue: 'demo', ai: Boolean(env.AI), paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET), environment: 'sandbox' });
  if (request.method === 'GET' && url.pathname === '/api/products') return reply({ products: demoCatalogue, source: 'demo', notice: 'Demonstration data only; prices and availability are not live.' });
  if (request.method === 'POST' && url.pathname === '/api/recommendations') {
    const input = await body<RecommendationRequest>(request);
    const error = recommendationInput(input);
    if (error) return reply({ error }, 400);
    return reply(await recommend(env, demoCatalogue, { ...input, requirements: input.requirements.trim(), priorities: [...new Set(input.priorities)] }));
  }
  if (request.method === 'POST' && url.pathname === '/api/checkout/orders') {
    const input = await body<CheckoutRequest>(request);
    if (!Array.isArray(input.productIds) || input.productIds.length < 1 || input.productIds.length > 20 || input.productIds.some((id) => typeof id !== 'string')) return reply({ error: 'Choose between 1 and 20 products.' }, 400);
    const products = findProducts(input.productIds);
    if (products.length !== new Set(input.productIds).size) return reply({ error: 'One or more products are invalid.' }, 400);
    return reply(await createPayPalOrder(env, products), 201);
  }
  const captureMatch = url.pathname.match(/^\/api\/checkout\/orders\/([A-Z0-9-]{8,64})\/capture$/i);
  if (request.method === 'POST' && captureMatch) return reply(await capturePayPalOrder(env, captureMatch[1]));
  return reply({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      const response = url.pathname.startsWith('/api/') ? await api(request, env, url) : await env.ASSETS.fetch(request);
      const secured = new Response(response.body, response);
      for (const [name, value] of Object.entries(securityHeaders)) secured.headers.set(name, value);
      return secured;
    } catch (error) {
      if (error instanceof Response) return error;
      const status = error instanceof ProviderError ? error.status : 500;
      console.error(JSON.stringify({ event: 'request_error', path: url.pathname, message: error instanceof Error ? error.message : 'Unknown error' }));
      return reply({ error: error instanceof ProviderError ? error.message : 'Unexpected server error.' }, status);
    }
  }
} satisfies ExportedHandler<Env>;
