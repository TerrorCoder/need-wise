export type Priority = 'affordability' | 'durability' | 'portability';
export interface Product { id: string; name: string; description: string; priceCents: number; category: string; merchant: string; source: 'demo' | 'channel3'; attributes: { durability: number; portability: number; value: number }; }
export interface RecommendationItem extends Product { reason: string }
export interface RecommendationResult { items: RecommendationItem[]; totalCents: number; remainingCents: number; summary: string; source: 'workers-ai' | 'deterministic-fallback'; notice: string; }
export interface AppStatus { catalogue: string; ai: boolean; paypal: boolean; environment: string; }
