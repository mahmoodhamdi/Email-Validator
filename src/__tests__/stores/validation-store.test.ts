import { act, renderHook } from '@testing-library/react';
import { useValidationStore } from '@/stores/validation-store';
import type { ValidationResult } from '@/types/email';

const createMockResult = (): ValidationResult => ({
  email: 'test@example.com',
  isValid: true,
  score: 85,
  checks: {
    syntax: { valid: true, message: 'Valid' },
    domain: { valid: true, exists: true, message: 'Valid' },
    mx: { valid: true, records: ['mx.example.com'], message: 'Found' },
    disposable: { isDisposable: false, message: 'Not disposable' },
    roleBased: { isRoleBased: false, role: null },
    freeProvider: { isFree: false, provider: null },
    typo: { hasTypo: false, suggestion: null },
    blacklisted: { isBlacklisted: false, lists: [] },
    catchAll: { isCatchAll: false },
  },
  deliverability: 'deliverable',
  risk: 'low',
  timestamp: new Date().toISOString(),
});

describe('useValidationStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useValidationStore());
    act(() => {
      result.current.reset();
    });
  });

  test('should have initial state', () => {
    const { result } = renderHook(() => useValidationStore());

    expect(result.current.currentEmail).toBe('');
    expect(result.current.currentResult).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should set email', () => {
    const { result } = renderHook(() => useValidationStore());

    act(() => {
      result.current.setEmail('test@example.com');
    });

    expect(result.current.currentEmail).toBe('test@example.com');
  });

  test('should set result', () => {
    const { result } = renderHook(() => useValidationStore());
    const mockResult = createMockResult();

    act(() => {
      result.current.setResult(mockResult);
    });

    expect(result.current.currentResult).toEqual(mockResult);
  });

  test('should set isValidating', () => {
    const { result } = renderHook(() => useValidationStore());

    act(() => {
      result.current.setIsValidating(true);
    });

    expect(result.current.isValidating).toBe(true);

    act(() => {
      result.current.setIsValidating(false);
    });

    expect(result.current.isValidating).toBe(false);
  });

  test('should set error', () => {
    const { result } = renderHook(() => useValidationStore());

    act(() => {
      result.current.setError('Something went wrong');
    });

    expect(result.current.error).toBe('Something went wrong');
  });

  test('should clear error', () => {
    const { result } = renderHook(() => useValidationStore());

    act(() => {
      result.current.setError('Error');
    });

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
  });

  test('should reset state', () => {
    const { result } = renderHook(() => useValidationStore());

    act(() => {
      result.current.setEmail('test@example.com');
      result.current.setResult(createMockResult());
      result.current.setIsValidating(true);
      result.current.setError('Error');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentEmail).toBe('');
    expect(result.current.currentResult).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
