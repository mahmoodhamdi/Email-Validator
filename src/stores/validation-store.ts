import { create } from 'zustand';
import type { ValidationResult } from '@/types/email';

interface ValidationState {
  currentEmail: string;
  currentResult: ValidationResult | null;
  isValidating: boolean;
  error: string | null;
  setEmail: (email: string) => void;
  setResult: (result: ValidationResult | null) => void;
  setIsValidating: (isValidating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useValidationStore = create<ValidationState>((set) => ({
  currentEmail: '',
  currentResult: null,
  isValidating: false,
  error: null,
  setEmail: (email) => set({ currentEmail: email }),
  setResult: (result) => set({ currentResult: result }),
  setIsValidating: (isValidating) => set({ isValidating }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      currentEmail: '',
      currentResult: null,
      isValidating: false,
      error: null,
    }),
}));
