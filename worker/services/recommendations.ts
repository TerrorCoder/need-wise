import type { Env, Product, RecommendationRequest, RecommendationResult } from '../types';
import { sumProducts, selectWithinBudget } from './budget';
import { searchChannel3 } from './channel3';

type AiOutput = { summary?: unknown; reasons?: unknown };
type QueryOutput = { query?: unknown };

function fallbackReason(product: Product, request: RecommendationRequest) {
  const priority = request.priorities[0] ?? 'value';
  return `${product.name} is a strong ${priority} option that fits within your stated limit.`;
}

async function interpretRequest(env: Pick<Env, 'AI'>, request: RecommendationRequest) {
  if (!env.AI) return request.requirements;
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        { role: 'system', content: 'Convert a shopping request into a concise Channel3 product search query. Return JSON only: {"query":"..."}. Preserve product categories, intended use, required features, and budget-relevant constraints. Never name a specific product unless the user did.' },
        { role: 'user', content: request.requirements }
      ],
      response_format: { type: 'json_object' }
    }) as { response?: string };
    const parsed = JSON.parse(response.response ?? '{}') as QueryOutput;
    if (typeof parsed.query === 'string' && parsed.query.trim().length >= 3 && parsed.query.length <= 300) return parsed.query.trim();
  } catch (error) {
    console.warn(JSON.stringify({ event: 'ai_interpretation_fallback', message: error instanceof Error ? error.message : 'Unknown AI error' }));
  }
  return request.requirements;
}

export async function recommend(env: Pick<Env, 'AI' | 'CHANNEL3_API_KEY'>, catalogue: Product[], request: RecommendationRequest): Promise<RecommendationResult> {
  const mode = request.mode ?? 'demo';
  let sourceProducts = catalogue;
  let providerNotice = 'Prices and product details are demonstration data, not live merchant listings.';
  if (mode === 'live') {
    const query = await interpretRequest(env, request);
    const live = await searchChannel3(env.CHANNEL3_API_KEY, query, request.budgetCents);
    sourceProducts = live.products;
    providerNotice = `Live catalogue results from Channel3. Prices, shipping, taxes, and availability can change at the retailer.${live.skipped ? ` ${live.skipped} result${live.skipped === 1 ? '' : 's'} omitted because price or required product data was unavailable.` : ''}`;
  }
  const selected = selectWithinBudget(sourceProducts, request.budgetCents, request.requirements, request.priorities);
  const totalCents = sumProducts(selected);
  let summary = selected.length ? (mode === 'live' ? 'A practical basket selected from live catalogue results.' : 'A practical basket selected from the demonstration catalogue.') : 'No catalogue combination fits this budget.';
  let reasons = Object.fromEntries(selected.map((product) => [product.id, fallbackReason(product, request)]));
  let source: RecommendationResult['source'] = 'deterministic-fallback';

  if (env.AI && selected.length) {
    try {
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: [
          { role: 'system', content: 'Explain a pre-validated shopping basket. Return JSON only: {"summary":"...","reasons":{"product-id":"..."}}. Never change IDs, prices, claims, or imply live inventory.' },
          { role: 'user', content: JSON.stringify({ requirements: request.requirements, priorities: request.priorities, products: selected.map(({ id, name, description, priceCents }) => ({ id, name, description, priceCents })) }) }
        ],
        response_format: { type: 'json_object' }
      }) as { response?: string };
      const parsed = JSON.parse(response.response ?? '{}') as AiOutput;
      if (typeof parsed.summary === 'string' && parsed.summary.length <= 400 && parsed.reasons && typeof parsed.reasons === 'object') {
        const safeReasons: Record<string, string> = {};
        for (const product of selected) {
          const value = (parsed.reasons as Record<string, unknown>)[product.id];
          safeReasons[product.id] = typeof value === 'string' && value.length <= 300 ? value : reasons[product.id];
        }
        summary = parsed.summary;
        reasons = safeReasons;
        source = 'workers-ai';
      }
    } catch (error) {
      console.warn(JSON.stringify({ event: 'ai_fallback', message: error instanceof Error ? error.message : 'Unknown AI error' }));
    }
  }

  return {
    items: selected.map((product) => ({ ...product, reason: reasons[product.id] })),
    totalCents,
    remainingCents: request.budgetCents - totalCents,
    summary,
    source,
    notice: `${providerNotice} AI text is explanatory; product IDs and budget totals are validated in code.`,
    mode
  };
}
