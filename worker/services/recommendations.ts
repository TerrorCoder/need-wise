import type { Env, Product, RecommendationRequest, RecommendationResult } from '../types';
import { sumProducts, selectWithinBudget } from './budget';

type AiOutput = { summary?: unknown; reasons?: unknown };

function fallbackReason(product: Product, request: RecommendationRequest) {
  const priority = request.priorities[0] ?? 'value';
  return `${product.name} is a strong ${priority} option that fits within your stated limit.`;
}

export async function recommend(env: Pick<Env, 'AI'>, catalogue: Product[], request: RecommendationRequest): Promise<RecommendationResult> {
  const selected = selectWithinBudget(catalogue, request.budgetCents, request.requirements, request.priorities);
  const totalCents = sumProducts(selected);
  let summary = selected.length ? 'A practical basket selected from the demonstration catalogue.' : 'No catalogue combination fits this budget.';
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
    notice: 'Prices and product details are demonstration data, not live merchant listings. AI text is explanatory; product IDs and budget totals are validated in code.'
  };
}
