import { describe, expect, it } from 'vitest';
import { demoCatalogue } from '../worker/data/catalog';
import { recommend } from '../worker/services/recommendations';

describe('recommendations', () => {
  const request = { budgetCents: 6000, requirements: 'portable study kit', priorities: ['portability' as const] };
  it('uses a safe fallback without AI', async () => {
    const result = await recommend({}, demoCatalogue, request);
    expect(result.source).toBe('deterministic-fallback');
    expect(result.totalCents).toBeLessThanOrEqual(request.budgetCents);
    expect(result.items.every((item) => demoCatalogue.some((product) => product.id === item.id))).toBe(true);
  });
  it('falls back when AI fails', async () => {
    const AI = { run: async () => { throw new Error('unavailable'); } };
    const result = await recommend({ AI: AI as never }, demoCatalogue, request);
    expect(result.source).toBe('deterministic-fallback');
  });
  it('does not accept model-invented product IDs', async () => {
    const AI = { run: async () => ({ response: JSON.stringify({ summary: 'Valid explanation', reasons: { invented: 'Fake item' } }) }) };
    const result = await recommend({ AI: AI as never }, demoCatalogue, request);
    expect(result.items.some((item) => item.id === 'invented')).toBe(false);
  });
  it('returns grounded replacement candidates without exceeding the budget', async () => {
    const result = await recommend({}, demoCatalogue.slice(0, 4), { budgetCents: 6000, requirements: 'portable study kit', priorities: ['portability'] });
    expect(result.alternatives).toBeDefined();
    expect(Object.values(result.alternatives ?? {}).every((items) => items.every((item) => !result.items.some((selected) => selected.id === item.id)))).toBe(true);
    expect(result.totalCents).toBeLessThanOrEqual(6000);
    for (const selected of result.items) {
      const preservedTotal = result.totalCents - selected.priceCents;
      expect((result.alternatives?.[selected.id] ?? []).every((alternative) => preservedTotal + alternative.priceCents <= 6000)).toBe(true);
    }
  });
});
