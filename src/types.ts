export type Priority = 'affordability' | 'durability' | 'portability';
export interface Product { id: string; name: string; description: string; priceCents: number; category: string; merchant: string; source: 'demo' | 'channel3'; imageUrl?: string; productUrl?: string; availability?: string; attributes: { durability: number; portability: number; value: number }; }
export interface RecommendationItem extends Product { reason: string }
export interface RecommendationResult { items: RecommendationItem[]; totalCents: number; remainingCents: number; summary: string; source: 'workers-ai' | 'deterministic-fallback'; notice: string; mode: 'demo' | 'live'; alternatives?: Record<string, RecommendationItem[]>; checkoutToken?: string; checkoutExpiresAt?: number; }
export interface AppStatus { catalogue: string; channel3: boolean; ai: boolean; paypal: boolean; environment: string; }
export interface RetailerAllocation { merchant: string; amountCents: number }
export interface CaptureResult { orderId: string; captured: boolean; status: string; amountCents?: number; currency?: string; duplicate?: boolean }
