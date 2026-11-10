import type { Priority, Product } from '../types';

export const sumProducts = (products: Product[]) => products.reduce((sum, product) => sum + product.priceCents, 0);

const words = (text: string) => new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));

export function selectWithinBudget(products: Product[], budgetCents: number, requirements: string, priorities: Priority[]): Product[] {
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 100 || products.length === 0) return [];
  const query = words(requirements);
  const scored = products.map((product) => {
    const productWords = words(`${product.name} ${product.description} ${product.category}`);
    const relevance = [...query].filter((word) => productWords.has(word)).length * 12;
    const priority = priorities.reduce((score, item) => score + (item === 'affordability' ? product.attributes.value : product.attributes[item]), 0);
    return { product, score: relevance + priority + product.attributes.value - product.priceCents / Math.max(budgetCents, 1) };
  }).sort((a, b) => b.score - a.score || a.product.priceCents - b.product.priceCents);
  const selected: Product[] = [];
  let total = 0;
  for (const { product } of scored) {
    if (total + product.priceCents <= budgetCents && selected.length < 4) {
      selected.push(product);
      total += product.priceCents;
    }
  }
  return selected;
}
