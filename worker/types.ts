export type Priority = 'affordability' | 'durability' | 'portability';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  merchant: string;
  source: 'demo' | 'channel3';
  attributes: { durability: number; portability: number; value: number };
}

export interface RecommendationRequest {
  budgetCents: number;
  requirements: string;
  priorities: Priority[];
}

export interface RecommendationItem extends Product { reason: string }

export interface RecommendationResult {
  items: RecommendationItem[];
  totalCents: number;
  remainingCents: number;
  summary: string;
  source: 'workers-ai' | 'deterministic-fallback';
  notice: string;
}

export interface CheckoutRequest { productIds: string[] }

export interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENVIRONMENT: 'sandbox';
  APP_URL: string;
  CHANNEL3_API_KEY?: string;
}
