import { useState, useCallback } from 'react';
import type { ValidationResult } from '@/types/email';
import { useHistoryStore } from '@/stores/history-store';

interface UseEmailValidatorReturn {
  result: ValidationResult | null;
  isLoading: boolean;
  error: string | null;
  validate: (email: string) => Promise<ValidationResult | null>;
  reset: () => void;
}

export function useEmailValidator(): UseEmailValidatorReturn {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToHistory = useHistoryStore((state) => state.addItem);

  const validate = useCallback(
    async (email: string): Promise<ValidationResult | null> => {
      if (!email.trim()) {
        setError('Email is required');
        return null;
      }

      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Validation failed');
        }

        const validationResult: ValidationResult = await response.json();
        setResult(validationResult);
        addToHistory(validationResult);
        return validationResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    result,
    isLoading,
    error,
    validate,
    reset,
  };
}
