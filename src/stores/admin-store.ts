/**
 * Admin Dashboard Store
 *
 * Zustand store for admin dashboard state management including
 * system stats, validation logs, and configuration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ValidationLogEntry {
  id: string;
  email: string;
  score: number;
  status: 'deliverable' | 'risky' | 'undeliverable' | 'unknown';
  risk: 'low' | 'medium' | 'high';
  timestamp: Date;
  responseTimeMs: number;
}

export interface SystemConfig {
  rateLimitMax: number;
  rateLimitWindow: number;
  smtpTimeout: number;
  cacheTtl: number;
  maxBulkSize: number;
}

export interface SecurityEvent {
  id: string;
  type: 'rate_limit' | 'blocked_ip' | 'invalid_request' | 'auth_failure';
  message: string;
  ip?: string;
  timestamp: Date;
}

interface AdminState {
  // Validation logs
  validationLogs: ValidationLogEntry[];
  maxLogs: number;

  // System config (overrides stored in localStorage)
  config: SystemConfig;

  // Security events
  securityEvents: SecurityEvent[];
  maxSecurityEvents: number;

  // Actions - Logs
  addValidationLog: (log: Omit<ValidationLogEntry, 'id'>) => void;
  clearValidationLogs: () => void;

  // Actions - Config
  updateConfig: (updates: Partial<SystemConfig>) => void;
  resetConfig: () => void;

  // Actions - Security
  addSecurityEvent: (event: Omit<SecurityEvent, 'id'>) => void;
  clearSecurityEvents: () => void;

  // Stats
  getOverviewStats: () => {
    totalValidationsToday: number;
    successRate: number;
    avgResponseTime: number;
    totalSecurityEvents: number;
  };

  // Export
  exportLogs: (format: 'json' | 'csv') => string;
}

const DEFAULT_CONFIG: SystemConfig = {
  rateLimitMax: 100,
  rateLimitWindow: 60000,
  smtpTimeout: 10000,
  cacheTtl: 300000,
  maxBulkSize: 1000,
};

const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      validationLogs: [],
      maxLogs: 5000,
      config: { ...DEFAULT_CONFIG },
      securityEvents: [],
      maxSecurityEvents: 1000,

      addValidationLog: (log) => {
        const entry: ValidationLogEntry = {
          ...log,
          id: generateId(),
        };
        set((state) => ({
          validationLogs: [entry, ...state.validationLogs].slice(0, state.maxLogs),
        }));
      },

      clearValidationLogs: () => set({ validationLogs: [] }),

      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },

      resetConfig: () => set({ config: { ...DEFAULT_CONFIG } }),

      addSecurityEvent: (event) => {
        const entry: SecurityEvent = {
          ...event,
          id: generateId(),
        };
        set((state) => ({
          securityEvents: [entry, ...state.securityEvents].slice(0, state.maxSecurityEvents),
        }));
      },

      clearSecurityEvents: () => set({ securityEvents: [] }),

      getOverviewStats: () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const logs = get().validationLogs;
        const todayLogs = logs.filter(
          (l) => new Date(l.timestamp) >= startOfDay
        );

        const totalValidationsToday = todayLogs.length;
        const deliverable = todayLogs.filter(
          (l) => l.status === 'deliverable'
        ).length;
        const successRate =
          totalValidationsToday > 0
            ? Math.round((deliverable / totalValidationsToday) * 100)
            : 0;
        const avgResponseTime =
          totalValidationsToday > 0
            ? Math.round(
                todayLogs.reduce((sum, l) => sum + l.responseTimeMs, 0) /
                  totalValidationsToday
              )
            : 0;
        const totalSecurityEvents = get().securityEvents.filter(
          (e) => new Date(e.timestamp) >= startOfDay
        ).length;

        return {
          totalValidationsToday,
          successRate,
          avgResponseTime,
          totalSecurityEvents,
        };
      },

      exportLogs: (format) => {
        const logs = get().validationLogs;

        if (format === 'json') {
          return JSON.stringify(logs, null, 2);
        }

        const headers = ['id', 'email', 'score', 'status', 'risk', 'timestamp', 'responseTimeMs'];
        const rows = logs.map((l) => [
          l.id,
          l.email,
          l.score,
          l.status,
          l.risk,
          new Date(l.timestamp).toISOString(),
          l.responseTimeMs,
        ]);

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      },
    }),
    {
      name: 'email-validator-admin',
      partialize: (state) => ({
        validationLogs: state.validationLogs.slice(0, 2000),
        config: state.config,
        securityEvents: state.securityEvents.slice(0, 500),
      }),
    }
  )
);
