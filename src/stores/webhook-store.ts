/**
 * Webhook Store
 *
 * Zustand store for managing webhooks with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Webhook, WebhookDelivery, WebhookEventType } from '@/lib/webhooks/types';

interface WebhookState {
  webhooks: Webhook[];
  deliveries: WebhookDelivery[];

  // Webhook CRUD
  createWebhook: (
    url: string,
    events: WebhookEventType[],
    description?: string
  ) => Webhook;
  updateWebhook: (
    id: string,
    updates: Partial<Pick<Webhook, 'url' | 'events' | 'description'>>
  ) => void;
  deleteWebhook: (id: string) => void;
  getWebhook: (id: string) => Webhook | undefined;
  getActiveWebhooks: () => Webhook[];

  // Delivery tracking
  addDelivery: (delivery: WebhookDelivery) => void;
  getDeliveries: (webhookId?: string) => WebhookDelivery[];
  clearDeliveries: (webhookId?: string) => void;

  // Webhook management
  toggleWebhook: (id: string) => void;
  regenerateSecret: (id: string) => string;
  resetFailureCount: (id: string) => void;
  updateLastTriggered: (id: string, success: boolean) => void;
}

/**
 * Generate unique webhook ID
 */
function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate secure webhook secret (browser-compatible)
 */
function generateSecret(): string {
  const array = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `whsec_${hex}`;
}

export const useWebhookStore = create<WebhookState>()(
  persist(
    (set, get) => ({
      webhooks: [],
      deliveries: [],

      createWebhook: (url, events, description) => {
        const newWebhook: Webhook = {
          id: generateId(),
          url: url.trim(),
          secret: generateSecret(),
          events,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          failureCount: 0,
          description: description?.trim(),
        };

        set((state) => ({
          webhooks: [...state.webhooks, newWebhook],
        }));

        return newWebhook;
      },

      updateWebhook: (id, updates) => {
        set((state) => ({
          webhooks: state.webhooks.map((w) =>
            w.id === id
              ? {
                  ...w,
                  ...updates,
                  updatedAt: new Date(),
                }
              : w
          ),
        }));
      },

      deleteWebhook: (id) => {
        set((state) => ({
          webhooks: state.webhooks.filter((w) => w.id !== id),
          deliveries: state.deliveries.filter((d) => d.webhookId !== id),
        }));
      },

      getWebhook: (id) => {
        return get().webhooks.find((w) => w.id === id);
      },

      getActiveWebhooks: () => {
        return get().webhooks.filter((w) => w.isActive);
      },

      addDelivery: (delivery) => {
        set((state) => ({
          // Keep last 100 deliveries
          deliveries: [delivery, ...state.deliveries].slice(0, 100),
        }));

        // Update webhook stats
        const webhook = get().getWebhook(delivery.webhookId);
        if (webhook) {
          get().updateLastTriggered(delivery.webhookId, delivery.status === 'success');
        }
      },

      getDeliveries: (webhookId) => {
        const deliveries = get().deliveries;
        return webhookId
          ? deliveries.filter((d) => d.webhookId === webhookId)
          : deliveries;
      },

      clearDeliveries: (webhookId) => {
        set((state) => ({
          deliveries: webhookId
            ? state.deliveries.filter((d) => d.webhookId !== webhookId)
            : [],
        }));
      },

      toggleWebhook: (id) => {
        set((state) => ({
          webhooks: state.webhooks.map((w) =>
            w.id === id
              ? { ...w, isActive: !w.isActive, updatedAt: new Date() }
              : w
          ),
        }));
      },

      regenerateSecret: (id) => {
        const newSecret = generateSecret();
        set((state) => ({
          webhooks: state.webhooks.map((w) =>
            w.id === id
              ? { ...w, secret: newSecret, updatedAt: new Date() }
              : w
          ),
        }));
        return newSecret;
      },

      resetFailureCount: (id) => {
        set((state) => ({
          webhooks: state.webhooks.map((w) =>
            w.id === id
              ? { ...w, failureCount: 0, updatedAt: new Date() }
              : w
          ),
        }));
      },

      updateLastTriggered: (id, success) => {
        set((state) => ({
          webhooks: state.webhooks.map((w) =>
            w.id === id
              ? {
                  ...w,
                  lastTriggeredAt: new Date(),
                  failureCount: success ? 0 : w.failureCount + 1,
                }
              : w
          ),
        }));
      },
    }),
    {
      name: 'email-validator-webhooks',
      partialize: (state) => ({
        webhooks: state.webhooks,
        // Only persist last 50 deliveries
        deliveries: state.deliveries.slice(0, 50),
      }),
    }
  )
);
