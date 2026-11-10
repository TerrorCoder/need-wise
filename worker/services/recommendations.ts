import type { Env, Product, RecommendationItem, RecommendationRequest, RecommendationResult, ShoppingIntent } from '../types';
import { sumProducts, selectWithinBudget, rankAlternatives } from './budget';
import { searchChannel3Queries } from './channel3';

type AiOutput = { summary?: unknown; reasons?: unknown };
type IntentOutput = Partial<Omit<ShoppingIntent, 'budgetCents' | 'priorities'>> & { query?: unknown; queries?: unknown };

const cleanList = (value: unknown, max: number) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter((item) => item.length >= 2 && item.length <= 100).slice(0, max) : [];

function fallbackIntent(request: RecommendationRequest): ShoppingIntent {
  const query = request.requirements.trim();
  return {
    objective: query,
    categories: [query],
    essentialTypes: [],
    optionalTypes: [],
    exclusions: [],
    priorities: request.priorities,
    budgetCents: request.budgetCents,
    queries: [query]
  };
}

async function interpretRequest(env: Pick<Env, 'AI'>, request: RecommendationRequest): Promise<ShoppingIntent> {
  const fallback = fallbackIntent(request);
  if (!env.AI) return fallback;
  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
      messages: [
        { role: 'system', content: 'Interpret a shopping request for product retrieval. Return JSON only with objective (string), categories (array), essentialTypes (array), optionalTypes (array), exclusions (array), and queries (array of at most 3 focused product searches). Do not invent a specific brand, product, compatibility, or requirement not supported by the request. Queries must search for product types, not generic phrases.' },
        { role: 'user', content: JSON.stringify({ requirements: request.requirements, priorities: request.priorities, budgetCents: request.budgetCents }) }
      ],
      response_format: { type: 'json_object' }
    }) as { response?: string };
    const parsed = JSON.parse(response.response ?? '{}') as IntentOutput;
    const queries = cleanList(parsed.queries, 3);
    const legacyQuery = typeof parsed.query === 'string' ? parsed.query.trim() : '';
    return {
      objective: typeof parsed.objective === 'string' && parsed.objective.trim() ? parsed.objective.trim().slice(0, 300) : fallback.objective,
      categories: cleanList(parsed.categories, 8),
      essentialTypes: cleanList(parsed.essentialTypes, 8),
      optionalTypes: cleanList(parsed.optionalTypes, 8),
      exclusions: cleanList(parsed.exclusions, 8),
      priorities: request.priorities,
      budgetCents: request.budgetCents,
      queries: queries.length ? queries : legacyQuery.length >= 3 ? [legacyQuery] : fallback.queries
    };
  } catch (error) {
    console.warn(JSON.stringify({ event: 'ai_interpretation_fallback', message: error instanceof Error ? error.message : 'Unknown AI error' }));
    return fallback;
  }
}

function fallbackReason(product: Product, request: RecommendationRequest, intent: ShoppingIntent) {
  const facts = product.description.trim() || 'The available catalogue information is limited.';
  const match = [...new Set([...intent.essentialTypes, ...intent.categories])].find((term) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(term.toLowerCase()));
  const need = match ? `${match.toLowerCase()} need` : request.requirements.toLowerCase();
  return `${product.name} addresses the ${need}. The listing says: ${facts.slice(0, 180)}${facts.length > 180 ? '…' : ''} It costs ${(product.priceCents / 100).toFixed(2)}, leaving ${(Math.max(0, request.budgetCents - product.priceCents) / 100).toFixed(2)} for other needs.`;
}

function buildAlternatives(products: Product[], selected: Product[], request: RecommendationRequest, intent: ShoppingIntent) {
  const total = sumProducts(selected);
  const alternatives: Record<string, RecommendationItem[]> = {};
  for (const item of selected) {
    const remaining = request.budgetCents - total + item.priceCents;
    const pool = rankAlternatives(products.filter((candidate) => candidate.id !== item.id), selected.filter((candidate) => candidate.id !== item.id), remaining, request.requirements, request.priorities, intent);
    alternatives[item.id] = pool.slice(0, 3).map((product) => ({ ...product, reason: fallbackReason(product, request, intent) }));
  }
  return alternatives;
}

export async function recommend(env: Pick<Env, 'AI' | 'CHANNEL3_API_KEY'>, catalogue: Product[], request: RecommendationRequest): Promise<RecommendationResult> {
  const mode = request.mode ?? 'demo';
  const intent = await interpretRequest(env, request);
  let sourceProducts = catalogue;
  let providerNotice = 'Prices and product details are demonstration data, not live merchant listings.';
  if (mode === 'live') {
    const live = await searchChannel3Queries(env.CHANNEL3_API_KEY, intent.queries, request.budgetCents);
    sourceProducts = live.products;
    providerNotice = `Live catalogue results from Channel3. Prices, shipping, taxes, and availability can change at the retailer.${live.skipped ? ` ${live.skipped} result${live.skipped === 1 ? '' : 's'} omitted because price or required product data was unavailable.` : ''}`;
  }
  const selected = selectWithinBudget(sourceProducts, request.budgetCents, request.requirements, request.priorities, intent);
  const totalCents = sumProducts(selected);
  let summary = selected.length ? (mode === 'live' ? 'A focused basket selected from live catalogue results.' : 'A focused basket selected from the demonstration catalogue.') : 'No relevant catalogue combination fits this budget.';
  const fallbackReasons = Object.fromEntries(selected.map((product) => [product.id, fallbackReason(product, request, intent)]));
  let reasons = fallbackReasons;
  let source: RecommendationResult['source'] = 'deterministic-fallback';

  if (env.AI && selected.length) {
    try {
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: [
          { role: 'system', content: 'Explain only a pre-validated shopping basket. Return JSON only: {"summary":"...","reasons":{"product-id":"..."}}. Ground every reason in the supplied product name, description, category, price, and request. State uncertainty when the listing lacks evidence. Never claim quality, compatibility, inventory, shipping, or savings that are not supplied. Never change IDs, prices, or selection.' },
          { role: 'user', content: JSON.stringify({ requirements: request.requirements, intent, products: selected.map(({ id, name, description, category, priceCents, merchant }) => ({ id, name, description, category, priceCents, merchant })) }) }
        ],
        response_format: { type: 'json_object' }
      }) as { response?: string };
      const parsed = JSON.parse(response.response ?? '{}') as AiOutput;
      if (typeof parsed.summary === 'string' && parsed.summary.length <= 400 && parsed.reasons && typeof parsed.reasons === 'object') {
        const safeReasons: Record<string, string> = {};
        for (const product of selected) {
          const value = (parsed.reasons as Record<string, unknown>)[product.id];
          safeReasons[product.id] = typeof value === 'string' && value.length <= 400 ? value : fallbackReasons[product.id];
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
    mode,
    intent,
    alternatives: buildAlternatives(sourceProducts, selected, request, intent)
  };
}
