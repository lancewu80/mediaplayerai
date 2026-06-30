import { create } from 'zustand';

export type PlanType = 'free' | 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: PlanType;
  label: string;
  price: string;
  period: string;
  savings?: string;
  productId: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$2.99',
    period: '/month',
    productId: 'mediaplayerai_premium_monthly',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$19.99',
    period: '/year',
    savings: 'Save 44%',
    productId: 'mediaplayerai_premium_yearly',
  },
];

interface SubscriptionStore {
  isSubscriber: boolean;
  plan: PlanType;
  expiresAt: number | null;
  loading: boolean;
  error: string | null;

  setSubscriber: (isSubscriber: boolean, plan?: PlanType, expiresAt?: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  isSubscriber: false,
  plan: 'free',
  expiresAt: null,
  loading: false,
  error: null,

  setSubscriber: (isSubscriber, plan = 'free', expiresAt = undefined) =>
    set({ isSubscriber, plan, expiresAt: expiresAt ?? null, error: null }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  clearSubscription: () =>
    set({ isSubscriber: false, plan: 'free', expiresAt: null }),
}));
