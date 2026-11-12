import type { AppStatus, CaptureResult, Priority, RecommendationResult, RetailerAllocation } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
  return data;
}

export const getStatus = () => request<AppStatus>('/api/status');
export const getRecommendations = (budgetCents: number, requirements: string, priorities: Priority[], mode: 'demo' | 'live') => request<RecommendationResult>('/api/recommendations', { method: 'POST', body: JSON.stringify({ budgetCents, requirements, priorities, mode }) });
export const createOrder = (productIds: string[], checkoutToken?: string) => request<{ orderId: string; approveUrl: string; totalCents: number; allocation: RetailerAllocation[] }>('/api/checkout/orders', { method: 'POST', body: JSON.stringify({ productIds, checkoutToken }) });
export const captureOrder = (orderId: string) => request<CaptureResult>(`/api/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', body: '{}' });
