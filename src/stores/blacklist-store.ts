/**
 * Blacklist Store
 *
 * Zustand store for managing custom blacklists with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Blacklist, BlacklistEntry, BlacklistExport } from '@/lib/blacklist/types';

interface BlacklistState {
  blacklists: Blacklist[];
  activeBlacklistId: string | null;

  // Blacklist CRUD
  createBlacklist: (name: string, description?: string) => Blacklist;
  updateBlacklist: (id: string, updates: Partial<Pick<Blacklist, 'name' | 'description'>>) => void;
  deleteBlacklist: (id: string) => void;
  getBlacklist: (id: string) => Blacklist | undefined;

  // Entry CRUD
  addEntry: (
    blacklistId: string,
    entry: Omit<BlacklistEntry, 'id' | 'createdAt'>
  ) => void;
  updateEntry: (
    blacklistId: string,
    entryId: string,
    updates: Partial<Pick<BlacklistEntry, 'pattern' | 'type' | 'reason' | 'isActive'>>
  ) => void;
  removeEntry: (blacklistId: string, entryId: string) => void;
  toggleEntry: (blacklistId: string, entryId: string) => void;

  // Bulk operations
  importEntries: (
    blacklistId: string,
    patterns: string[],
    type: BlacklistEntry['type']
  ) => number;
  clearEntries: (blacklistId: string) => void;

  // Export/Import
  exportBlacklists: () => string;
  importBlacklists: (json: string) => { success: boolean; message: string; count?: number };

  // Active blacklist
  setActiveBlacklist: (id: string | null) => void;

  // Get all active blacklists for validation
  getActiveBlacklists: () => Blacklist[];
}

/**
 * Generate a random ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const useBlacklistStore = create<BlacklistState>()(
  persist(
    (set, get) => ({
      blacklists: [],
      activeBlacklistId: null,

      createBlacklist: (name, description) => {
        const newBlacklist: Blacklist = {
          id: generateId(),
          name: name.trim(),
          description: description?.trim(),
          entries: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          blacklists: [...state.blacklists, newBlacklist],
        }));

        return newBlacklist;
      },

      updateBlacklist: (id, updates) => {
        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === id
              ? {
                  ...bl,
                  ...updates,
                  updatedAt: new Date(),
                }
              : bl
          ),
        }));
      },

      deleteBlacklist: (id) => {
        set((state) => ({
          blacklists: state.blacklists.filter((bl) => bl.id !== id),
          activeBlacklistId:
            state.activeBlacklistId === id ? null : state.activeBlacklistId,
        }));
      },

      getBlacklist: (id) => {
        return get().blacklists.find((bl) => bl.id === id);
      },

      addEntry: (blacklistId, entry) => {
        const newEntry: BlacklistEntry = {
          ...entry,
          id: generateId(),
          createdAt: new Date(),
        };

        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === blacklistId
              ? {
                  ...bl,
                  entries: [...bl.entries, newEntry],
                  updatedAt: new Date(),
                }
              : bl
          ),
        }));
      },

      updateEntry: (blacklistId, entryId, updates) => {
        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === blacklistId
              ? {
                  ...bl,
                  entries: bl.entries.map((e) =>
                    e.id === entryId ? { ...e, ...updates } : e
                  ),
                  updatedAt: new Date(),
                }
              : bl
          ),
        }));
      },

      removeEntry: (blacklistId, entryId) => {
        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === blacklistId
              ? {
                  ...bl,
                  entries: bl.entries.filter((e) => e.id !== entryId),
                  updatedAt: new Date(),
                }
              : bl
          ),
        }));
      },

      toggleEntry: (blacklistId, entryId) => {
        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === blacklistId
              ? {
                  ...bl,
                  entries: bl.entries.map((e) =>
                    e.id === entryId ? { ...e, isActive: !e.isActive } : e
                  ),
                  updatedAt: new Date(),
                }
              : bl
          ),
        }));
      },

      importEntries: (blacklistId, patterns, type) => {
        // Filter out empty patterns and duplicates
        const existingPatterns = new Set(
          get()
            .blacklists.find((bl) => bl.id === blacklistId)
            ?.entries.map((e) => e.pattern.toLowerCase()) || []
        );

        const newEntries: BlacklistEntry[] = patterns
          .map((p) => p.trim().toLowerCase())
          .filter((p) => p && !existingPatterns.has(p))
          .map((pattern) => ({
            id: generateId(),
            pattern,
            type,
            createdAt: new Date(),
            isActive: true,
          }));

        if (newEntries.length === 0) {
          return 0;
        }

        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === blacklistId
              ? {
                  ...bl,
                  entries: [...bl.entries, ...newEntries],
                  updatedAt: new Date(),
                }
              : bl
          ),
        }));

        return newEntries.length;
      },

      clearEntries: (blacklistId) => {
        set((state) => ({
          blacklists: state.blacklists.map((bl) =>
            bl.id === blacklistId
              ? { ...bl, entries: [], updatedAt: new Date() }
              : bl
          ),
        }));
      },

      exportBlacklists: () => {
        const exportData: BlacklistExport = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          blacklists: get().blacklists,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importBlacklists: (json) => {
        try {
          const data = JSON.parse(json) as BlacklistExport;

          if (!data.blacklists || !Array.isArray(data.blacklists)) {
            return { success: false, message: 'Invalid format: missing blacklists array' };
          }

          // Validate structure
          for (const bl of data.blacklists) {
            if (!bl.name || !Array.isArray(bl.entries)) {
              return { success: false, message: 'Invalid blacklist structure' };
            }
          }

          // Assign new IDs to avoid conflicts
          const importedBlacklists: Blacklist[] = data.blacklists.map((bl) => ({
            ...bl,
            id: generateId(),
            entries: bl.entries.map((e) => ({
              ...e,
              id: generateId(),
              createdAt: new Date(e.createdAt),
            })),
            createdAt: new Date(bl.createdAt),
            updatedAt: new Date(),
          }));

          set((state) => ({
            blacklists: [...state.blacklists, ...importedBlacklists],
          }));

          return {
            success: true,
            message: `Imported ${importedBlacklists.length} blacklist(s)`,
            count: importedBlacklists.length,
          };
        } catch {
          return { success: false, message: 'Invalid JSON format' };
        }
      },

      setActiveBlacklist: (id) => {
        set({ activeBlacklistId: id });
      },

      getActiveBlacklists: () => {
        return get().blacklists;
      },
    }),
    {
      name: 'email-validator-blacklists',
      partialize: (state) => ({
        blacklists: state.blacklists,
        activeBlacklistId: state.activeBlacklistId,
      }),
    }
  )
);
