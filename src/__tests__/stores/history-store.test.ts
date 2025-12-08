import { act, renderHook } from '@testing-library/react';
import { useHistoryStore } from '@/stores/history-store';
import type { ValidationResult } from '@/types/email';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const createMockResult = (email: string): ValidationResult => ({
  email,
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

describe('useHistoryStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // Reset store state
    const { result } = renderHook(() => useHistoryStore());
    act(() => {
      result.current.clearHistory();
    });
  });

  test('should start with empty history', () => {
    const { result } = renderHook(() => useHistoryStore());
    expect(result.current.items).toEqual([]);
  });

  test('should add item to history', () => {
    const { result } = renderHook(() => useHistoryStore());
    const mockResult = createMockResult('test@example.com');

    act(() => {
      result.current.addItem(mockResult);
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].email).toBe('test@example.com');
    expect(result.current.items[0].id).toBeDefined();
  });

  test('should add items in reverse chronological order', () => {
    const { result } = renderHook(() => useHistoryStore());

    act(() => {
      result.current.addItem(createMockResult('first@example.com'));
    });

    act(() => {
      result.current.addItem(createMockResult('second@example.com'));
    });

    expect(result.current.items[0].email).toBe('second@example.com');
    expect(result.current.items[1].email).toBe('first@example.com');
  });

  test('should remove item from history', () => {
    const { result } = renderHook(() => useHistoryStore());

    act(() => {
      result.current.addItem(createMockResult('test@example.com'));
    });

    const itemId = result.current.items[0].id;

    act(() => {
      result.current.removeItem(itemId);
    });

    expect(result.current.items.length).toBe(0);
  });

  test('should clear all history', () => {
    const { result } = renderHook(() => useHistoryStore());

    act(() => {
      result.current.addItem(createMockResult('test1@example.com'));
      result.current.addItem(createMockResult('test2@example.com'));
      result.current.addItem(createMockResult('test3@example.com'));
    });

    expect(result.current.items.length).toBe(3);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.items.length).toBe(0);
  });

  test('should get item by id', () => {
    const { result } = renderHook(() => useHistoryStore());

    act(() => {
      result.current.addItem(createMockResult('test@example.com'));
    });

    const itemId = result.current.items[0].id;
    const item = result.current.getItem(itemId);

    expect(item?.email).toBe('test@example.com');
  });

  test('should return undefined for non-existent id', () => {
    const { result } = renderHook(() => useHistoryStore());
    const item = result.current.getItem('non-existent-id');

    expect(item).toBeUndefined();
  });

  test('should limit history to 100 items', () => {
    const { result } = renderHook(() => useHistoryStore());

    act(() => {
      for (let i = 0; i < 110; i++) {
        result.current.addItem(createMockResult(`test${i}@example.com`));
      }
    });

    expect(result.current.items.length).toBe(100);
    expect(result.current.items[0].email).toBe('test109@example.com');
  });
});
