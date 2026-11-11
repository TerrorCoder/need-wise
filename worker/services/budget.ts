import type { Priority, Product, ShoppingIntent } from '../types';

export const sumProducts = (products: Product[]) => products.reduce((sum, product) => sum + product.priceCents, 0);

const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'need', 'want', 'some', 'student', 'user', 'basic', 'affordable']);
const words = (text: string) => new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stopWords.has(word)));
const evidence = (product: Product) => words(`${product.name} ${product.description} ${product.category}`);

function categoryKey(product: Product) {
  return product.category.toLowerCase().trim() || 'catalogue';
}

export function selectWithinBudget(products: Product[], budgetCents: number, requirements: string, priorities: Priority[], intent?: ShoppingIntent): Product[] {
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 100 || products.length === 0) return [];
  const requested = words(requirements);
  const positive = new Set([...requested, ...(intent?.categories ?? []).flatMap((value) => [...words(value)]), ...(intent?.essentialTypes ?? []).flatMap((value) => [...words(value)]), ...(intent?.optionalTypes ?? []).flatMap((value) => [...words(value)])]);
  const categoryTerms = new Set((intent?.categories ?? []).flatMap((value) => [...words(value)]));
  const essentialTerms = new Set((intent?.essentialTypes ?? []).flatMap((value) => [...words(value)]));
  const excluded = (intent?.exclusions ?? []).map((value) => value.toLowerCase().trim()).filter(Boolean);
  const minimumEvidence = intent && (intent.essentialTypes.length > 0 || intent.categories.length > 1) ? 2 : 1;
  const scored = products.map((product) => {
    const productWords = evidence(product);
    const directMatches = [...positive].filter((word) => productWords.has(word));
    const categoryMatches = [...categoryTerms].filter((word) => words(product.category).has(word));
    const essentialMatches = [...essentialTerms].filter((word) => productWords.has(word));
    const productText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    const excludedMatches = excluded.filter((phrase) => productText.includes(phrase) || [...words(phrase)].every((word) => productWords.has(word)));
    const relevance = directMatches.length * 18;
    const priority = priorities.reduce((score, item) => score + (item === 'affordability' ? product.attributes.value : product.attributes[item]), 0);
    const affordability = product.priceCents <= budgetCents ? Math.max(0, 8 - (product.priceCents / budgetCents) * 8) : -100;
    const evidenceScore = product.description.trim().length > 20 ? 4 : 0;
    return { product, score: relevance + priority + affordability + evidenceScore - excludedMatches.length * 35, matches: directMatches.length, categoryMatches: categoryMatches.length, essentialMatches: essentialMatches.length, category: categoryKey(product) };
  }).filter((candidate) => candidate.matches >= minimumEvidence && candidate.score > 0 && !(essentialTerms.size > 0 && candidate.categoryMatches === 0 && candidate.essentialMatches < 2) && !excluded.some((phrase) => {
    const productText = `${candidate.product.name} ${candidate.product.description} ${candidate.product.category}`.toLowerCase();
    return productText.includes(phrase) || [...words(phrase)].every((word) => evidence(candidate.product).has(word));
  }))
    .sort((a, b) => b.score - a.score || a.product.priceCents - b.product.priceCents);

  const selected: Product[] = [];
  const selectedIds = new Set<string>();
  const categories = new Set<string>();
  let total = 0;
  const remaining = [...scored];
  while (selected.length < 4) {
    const affordable = remaining
      .filter((candidate) => !selectedIds.has(candidate.product.id) && total + candidate.product.priceCents <= budgetCents)
      .sort((a, b) => Number(categories.has(a.category)) - Number(categories.has(b.category)) || b.score - a.score || a.product.priceCents - b.product.priceCents);
    const candidate = affordable[0];
    if (!candidate) break;
    selected.push(candidate.product);
    selectedIds.add(candidate.product.id);
    categories.add(candidate.category);
    total += candidate.product.priceCents;
    remaining.splice(remaining.indexOf(candidate), 1);
  }
  return selected;
}

export function rankAlternatives(products: Product[], selected: Product[], budgetCents: number, requirements: string, priorities: Priority[], intent?: ShoppingIntent): Product[] {
  const selectedIds = new Set(selected.map((product) => product.id));
  return selectWithinBudget(products.filter((product) => !selectedIds.has(product.id)), budgetCents, requirements, priorities, intent);
}
