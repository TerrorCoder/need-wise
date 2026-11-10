import { describe, expect, it } from 'vitest';
import { demoCatalogue } from '../worker/data/catalog';
import { selectWithinBudget, sumProducts } from '../worker/services/budget';

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
});
