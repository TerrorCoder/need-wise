import { describe, expect, it } from 'vitest';
import { demoCatalogue } from '../worker/data/catalog';
import { selectWithinBudget, sumProducts } from '../worker/services/budget';
import type { Product, ShoppingIntent } from '../worker/types';

describe('budget enforcement', () => {
  it('never exceeds the maximum budget', () => {
    const selected = selectWithinBudget(demoCatalogue, 5000, 'study essentials', ['affordability']);
    expect(selected.length).toBeGreaterThan(0);
    expect(sumProducts(selected)).toBeLessThanOrEqual(5000);
  });
  it('rejects invalid budgets and empty catalogues', () => {
    expect(selectWithinBudget(demoCatalogue, -1, 'study', [])).toEqual([]);
    expect(selectWithinBudget([], 5000, 'study', [])).toEqual([]);
  });
  it('favours relevant products', () => {
    const selected = selectWithinBudget(demoCatalogue, 4000, 'water bottle', ['durability']);
    expect(selected.some((item) => item.id === 'demo-bottle-01')).toBe(true);
  });
  it('rejects misleading names and prefers useful category diversity', () => {
    const intent: ShoppingIntent = {
      objective: 'university study essentials',
      categories: ['stationery', 'study accessories'],
      essentialTypes: ['notebook', 'pen'],
      optionalTypes: ['water bottle'],
      exclusions: ['hair ties', 'textbook'],
      priorities: ['affordability'],
      budgetCents: 7500,
      queries: ['notebooks', 'pens', 'study accessories']
    };
    const products: Product[] = [
      { id: 'misleading', name: 'Study Buddy Hair Ties', description: 'Elastic hair accessories', priceCents: 500, category: 'hair accessories', merchant: 'retailer', source: 'channel3', attributes: { durability: 3, portability: 4, value: 5 } },
      { id: 'notebook', name: 'Ruled Notebook', description: 'Ruled pages for lecture notes and assignments', priceCents: 900, category: 'stationery', merchant: 'retailer', source: 'channel3', attributes: { durability: 3, portability: 4, value: 5 } },
      { id: 'pen', name: 'Ballpoint Pen Set', description: 'Smooth writing pens for everyday notes', priceCents: 600, category: 'stationery', merchant: 'retailer', source: 'channel3', attributes: { durability: 3, portability: 5, value: 5 } },
      { id: 'bottle', name: 'Reusable Water Bottle', description: 'Stainless steel bottle for campus days', priceCents: 1500, category: 'hydration', merchant: 'retailer', source: 'channel3', attributes: { durability: 5, portability: 4, value: 4 } }
    ];
    const selected = selectWithinBudget(products, 7500, 'university study essentials', ['affordability'], intent);
    expect(selected.map((item) => item.id)).not.toContain('misleading');
    expect(selected.map((item) => item.id)).toEqual(expect.arrayContaining(['notebook', 'pen']));
    expect(sumProducts(selected)).toBeLessThanOrEqual(7500);
  });
});
