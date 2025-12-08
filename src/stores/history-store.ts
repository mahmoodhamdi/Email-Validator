import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryItem, ValidationResult } from '@/types/email';

interface HistoryState {
  items: HistoryItem[];
  addItem: (result: ValidationResult) => void;
  removeItem: (id: string) => void;
  clearHistory: () => void;
  getItem: (id: string) => HistoryItem | undefined;
}

const MAX_HISTORY_ITEMS = 100;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (result: ValidationResult) => {
        const id = `${result.email}-${Date.now()}`;
        const newItem: HistoryItem = { ...result, id };

        set((state) => {
          const updatedItems = [newItem, ...state.items].slice(0, MAX_HISTORY_ITEMS);
          return { items: updatedItems };
        });
      },
      removeItem: (id: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },
      clearHistory: () => {
        set({ items: [] });
      },
      getItem: (id: string) => {
        return get().items.find((item) => item.id === id);
      },
    }),
    {
      name: 'email-validator-history',
    }
  )
);
