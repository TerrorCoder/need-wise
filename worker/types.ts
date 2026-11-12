export type Priority = 'affordability' | 'durability' | 'portability';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  merchant: string;
  source: 'demo' | 'channel3';
  imageUrl?: string;
  productUrl?: string;
  availability?: string;
  attributes: { durability: number; portability: number; value: number };
}

export interface RecommendationRequest {
  budgetCents: number;
  requirements: string;
  priorities: Priority[];
  mode?: 'demo' | 'live';
}

export interface RecommendationItem extends Product { reason: string }

export interface ShoppingIntent {
  objective: string;
  categories: string[];
  essentialTypes: string[];
  optionalTypes: string[];
  exclusions: string[];
  priorities: Priority[];
  budgetCents: number;
  queries: string[];
}

export interface RecommendationResult {
  items: RecommendationItem[];
  totalCents: number;
  remainingCents: number;
  summary: string;
  source: 'workers-ai' | 'deterministic-fallback';
  notice: string;
  mode: 'demo' | 'live';
  intent?: ShoppingIntent;
  alternatives?: Record<string, RecommendationItem[]>;
  checkoutToken?: string;
  checkoutExpiresAt?: number;
}

export interface CheckoutRequest { productIds: string[]; checkoutToken?: string }

export interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENVIRONMENT: 'sandbox';
  APP_URL: string;
  CHANNEL3_API_KEY?: string;
  BASKET_SIGNING_SECRET?: string;
}
