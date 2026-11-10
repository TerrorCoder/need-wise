import { describe, expect, it } from 'vitest';
import { selectWithinBudget } from '../worker/services/budget';
import type { Product, ShoppingIntent } from '../worker/types';

const item = (id: string, name: string, description: string, category: string, priceCents: number): Product => ({
  id, name, description, category, priceCents, merchant: 'evaluation retailer', source: 'channel3',
  attributes: { durability: 3, portability: 3, value: 4 }
});

const scenarios: Array<{ name: string; request: string; budgetCents: number; intent: ShoppingIntent; products: Product[]; expected: string }> = [
  {
    name: 'university study essentials',
    request: 'University study essentials',
    budgetCents: 7500,
    intent: { objective: 'study essentials', categories: ['stationery', 'study accessories'], essentialTypes: ['notebook', 'pen'], optionalTypes: ['bottle'], exclusions: ['hair ties', 'textbook'], priorities: ['affordability'], budgetCents: 7500, queries: ['notebooks', 'pens'] },
    products: [item('notes', 'Ruled notebook', 'Pages for lecture notes and assignments', 'stationery', 900), item('pens', 'Ballpoint pen set', 'Pens for everyday writing', 'stationery', 600), item('hair', 'Study Buddy hair ties', 'Elastic hair accessories', 'hair accessories', 500), item('book', 'Algebra textbook', 'Introductory algebra reference', 'books', 2200)],
    expected: 'notes'
  },
  {
    name: 'basic home office',
    request: 'Basic home office setup',
    budgetCents: 10000,
    intent: { objective: 'home office', categories: ['office accessories'], essentialTypes: ['desk lamp', 'keyboard'], optionalTypes: ['organizer'], exclusions: ['travel'], priorities: ['affordability'], budgetCents: 10000, queries: ['desk lamp', 'keyboard'] },
    products: [item('lamp', 'LED desk lamp', 'Adjustable light for a desk', 'office lighting', 2400), item('keyboard', 'Compact keyboard', 'USB keyboard for a computer', 'office accessories', 1800), item('brand', 'Travel office mug', 'Mug with travel branding', 'drinkware', 900)],
    expected: 'lamp'
  },
  {
    name: 'affordable travel essentials',
    request: 'Affordable travel essentials',
    budgetCents: 5000,
    intent: { objective: 'travel essentials', categories: ['travel accessories'], essentialTypes: ['packing cubes', 'luggage tag'], optionalTypes: ['bottle'], exclusions: ['travel book'], priorities: ['affordability'], budgetCents: 5000, queries: ['packing cubes', 'luggage tag'] },
    products: [item('packing', 'Packing cube set', 'Organizers for luggage', 'travel accessories', 1600), item('tag', 'Luggage tag', 'Tag for identifying luggage', 'travel accessories', 700), item('book', 'Travel writing book', 'A book about travel stories', 'books', 1200)],
    expected: 'packing'
  },
  {
    name: 'beginner drawing supplies',
    request: 'Beginner drawing supplies',
    budgetCents: 4000,
    intent: { objective: 'drawing supplies', categories: ['drawing tools'], essentialTypes: ['pencil', 'sketchbook'], optionalTypes: ['eraser'], exclusions: ['art history book'], priorities: ['affordability'], budgetCents: 4000, queries: ['drawing pencils', 'sketchbook'] },
    products: [item('pencils', 'Graphite drawing pencils', 'Pencils for sketching', 'drawing tools', 1100), item('sketch', 'Beginner sketchbook', 'Paper for drawing practice', 'drawing supplies', 1300), item('book', 'Art history book', 'History of art movements', 'books', 2500)],
    expected: 'pencils'
  },
  {
    name: 'laptop accessories',
    request: 'Laptop accessories for a university student',
    budgetCents: 6000,
    intent: { objective: 'laptop accessories', categories: ['computer accessories'], essentialTypes: ['laptop stand', 'USB hub'], optionalTypes: ['mouse'], exclusions: [], priorities: ['portability'], budgetCents: 6000, queries: ['laptop stand', 'USB hub'] },
    products: [item('stand', 'Portable laptop stand', 'Adjustable stand for laptops', 'computer accessories', 2200), item('hub', 'USB-C hub', 'Hub with USB ports; compatibility varies by laptop', 'computer accessories', 1900), item('book', 'Laptop repair book', 'General computer repair guide', 'books', 1500)],
    expected: 'stand'
  }
];

describe('recommendation quality evaluation', () => {
  for (const scenario of scenarios) {
    it(`selects relevant products for ${scenario.name}`, () => {
      const selected = selectWithinBudget(scenario.products, scenario.budgetCents, scenario.request, scenario.intent.priorities, scenario.intent);
      expect(selected.map((product) => product.id)).toContain(scenario.expected);
      expect(selected.every((product) => product.category !== 'books' || scenario.intent.categories.includes(product.category))).toBe(true);
      expect(new Set(selected.map((product) => product.id)).size).toBe(selected.length);
    });
  }

  it('honestly returns no result when the budget cannot accommodate a suitable item', () => {
    const intent = scenarios[0].intent;
    const selected = selectWithinBudget([item('notes', 'Ruled notebook', 'Pages for lecture notes', 'stationery', 900)], 500, 'Study essentials', ['affordability'], { ...intent, budgetCents: 500 });
    expect(selected).toEqual([]);
  });
});
