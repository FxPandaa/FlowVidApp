/**
 * FlowVid - Subscription Store
 * Manages billing/subscription state with the backend API
 */

import { create } from "zustand/index";
import { useAuthStore } from "./authStore";
import { API_URL } from "../config";

// Mirror the backend subscription statuses
export type SubscriptionStatus =
  | "not_subscribed"
  | "paid_pending_provision"
  | "provisioned_pending_confirm"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  tier: "free" | "vreamio_plus";
  plan: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionState {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  error: string | null;
  checkoutLoading: boolean;

  // Actions
  fetchStatus: () => Promise<void>;
  startCheckout: () => Promise<string | null>;
  openPortal: () => Promise<string | null>;
  clearError: () => void;
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useSubscriptionStore = create<SubscriptionState>()((set) => ({
  subscription: null,
  isLoading: false,
  error: null,
  checkoutLoading: false,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/billing/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          set({ subscription: null, isLoading: false });
          return;
        }
        throw new Error("Failed to fetch subscription status");
      }

      const data = await response.json();
      set({ subscription: data.data, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load subscription",
      });
    }
  },

  startCheckout: async () => {
    set({ checkoutLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start checkout");
      }

      const data = await response.json();
      const checkoutUrl = data.data.checkoutUrl;
      set({ checkoutLoading: false });
      return checkoutUrl;
    } catch (error) {
      set({
        checkoutLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to start checkout",
      });
      return null;
    }
  },

  openPortal: async () => {
    try {
      const response = await fetch(`${API_URL}/billing/portal`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to open portal");
      }

      const data = await response.json();
      return data.data.portalUrl;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to open portal",
      });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
