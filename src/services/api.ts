import type { AppStatus, Priority, RecommendationResult } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
  return data;
}

export const getStatus = () => request<AppStatus>('/api/status');
export const getRecommendations = (budgetCents: number, requirements: string, priorities: Priority[]) => request<RecommendationResult>('/api/recommendations', { method: 'POST', body: JSON.stringify({ budgetCents, requirements, priorities }) });
export const createOrder = (productIds: string[]) => request<{ orderId: string; approveUrl: string }>('/api/checkout/orders', { method: 'POST', body: JSON.stringify({ productIds }) });
export const captureOrder = (orderId: string) => request<{ captured: boolean; status: string }>(`/api/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', body: '{}' });
