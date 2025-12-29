import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailValidator } from '@/components/email/EmailValidator';
import { useValidationStore } from '@/stores/validation-store';
import { useHistoryStore } from '@/stores/history-store';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock child components
jest.mock('@/components/email/ValidationResult', () => ({
  ValidationResult: ({ result }: { result: { email: string } }) => (
    <div data-testid="validation-result">{result.email}</div>
  ),
}));

jest.mock('@/components/email/ValidationResultSkeleton', () => ({
  ValidationResultSkeleton: () => <div data-testid="validation-skeleton">Loading...</div>,
}));

// Mock stores
jest.mock('@/stores/validation-store');
jest.mock('@/stores/history-store');

const mockUseValidationStore = useValidationStore as jest.MockedFunction<typeof useValidationStore>;
const mockUseHistoryStore = useHistoryStore as jest.MockedFunction<typeof useHistoryStore>;

// Mock the addItem function that gets returned from the selector
const mockAddItem = jest.fn();

const mockValidationResult = {
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
  deliverability: 'deliverable' as const,
  risk: 'low' as const,
  timestamp: new Date().toISOString(),
};

describe('EmailValidator', () => {
  const mockSetResult = jest.fn();
  const mockSetIsValidating = jest.fn();
  const mockSetEmail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddItem.mockClear();
    (global.fetch as jest.Mock).mockReset();

    mockUseValidationStore.mockReturnValue({
      currentEmail: '',
      currentResult: null,
      isValidating: false,
      error: null,
      setEmail: mockSetEmail,
      setResult: mockSetResult,
      setIsValidating: mockSetIsValidating,
      setError: jest.fn(),
      reset: jest.fn(),
    });

    // Mock the selector pattern: useHistoryStore((state) => state.addItem)
    mockUseHistoryStore.mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ addItem: mockAddItem, items: [], removeItem: jest.fn(), clearHistory: jest.fn(), getItem: jest.fn() });
      }
      return mockAddItem;
    });
  });

  describe('initial render', () => {
    test('renders email input', () => {
      render(<EmailValidator />);
      expect(screen.getByPlaceholderText('Enter email address...')).toBeInTheDocument();
    });

    test('renders validate button', () => {
      render(<EmailValidator />);
      expect(screen.getByText('Validate Email')).toBeInTheDocument();
    });

    test('renders real-time toggle', () => {
      render(<EmailValidator />);
      expect(screen.getByText('Real-time validation')).toBeInTheDocument();
    });

    test('validate button is disabled when input is empty', () => {
      render(<EmailValidator />);
      const button = screen.getByText('Validate Email');
      expect(button).toBeDisabled();
    });

    test('renders title and description', () => {
      render(<EmailValidator />);
      expect(screen.getByText('Email Validator')).toBeInTheDocument();
      expect(screen.getByText(/validate its format, domain, and deliverability/)).toBeInTheDocument();
    });
  });

  describe('with initial email', () => {
    test('populates input with initial email', () => {
      render(<EmailValidator initialEmail="preset@example.com" />);
      const input = screen.getByPlaceholderText('Enter email address...');
      expect(input).toHaveValue('preset@example.com');
    });

    test('auto-validates initial email', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      });

      render(<EmailValidator initialEmail="auto@example.com" />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/validate', expect.any(Object));
      });
    });
  });

  describe('form submission', () => {
    test('calls API on form submit', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      const button = screen.getByText('Validate Email');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/validate', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        }));
      });
    });

    test('sets loading state during validation', async () => {
      const user = userEvent.setup();

      // Return a promise that never resolves to keep loading state
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(mockSetIsValidating).toHaveBeenCalledWith(true);
      });
    });

    test('updates store with result on success', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(mockSetResult).toHaveBeenCalledWith(mockValidationResult);
      });
    });

    test('adds result to history on success', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith(mockValidationResult);
      });
    });

    test('resets loading state after validation', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(mockSetIsValidating).toHaveBeenLastCalledWith(false);
      });
    });
  });

  describe('loading state', () => {
    test('shows skeleton when loading without result', () => {
      mockUseValidationStore.mockReturnValue({
        currentEmail: 'test@example.com',
        currentResult: null,
        isValidating: true,
        error: null,
        setEmail: mockSetEmail,
        setResult: mockSetResult,
        setIsValidating: mockSetIsValidating,
        setError: jest.fn(),
        reset: jest.fn(),
      });

      render(<EmailValidator />);

      expect(screen.getByTestId('validation-skeleton')).toBeInTheDocument();
    });

    test('shows loading text on button', () => {
      mockUseValidationStore.mockReturnValue({
        currentEmail: 'test@example.com',
        currentResult: null,
        isValidating: true,
        error: null,
        setEmail: mockSetEmail,
        setResult: mockSetResult,
        setIsValidating: mockSetIsValidating,
        setError: jest.fn(),
        reset: jest.fn(),
      });

      render(<EmailValidator />);

      expect(screen.getByText('Validating...')).toBeInTheDocument();
    });

    test('disables input while loading', () => {
      mockUseValidationStore.mockReturnValue({
        currentEmail: 'test@example.com',
        currentResult: null,
        isValidating: true,
        error: null,
        setEmail: mockSetEmail,
        setResult: mockSetResult,
        setIsValidating: mockSetIsValidating,
        setError: jest.fn(),
        reset: jest.fn(),
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      expect(input).toBeDisabled();
    });
  });

  describe('result display', () => {
    test('displays validation result when available', () => {
      mockUseValidationStore.mockReturnValue({
        currentEmail: 'test@example.com',
        currentResult: mockValidationResult,
        isValidating: false,
        error: null,
        setEmail: mockSetEmail,
        setResult: mockSetResult,
        setIsValidating: mockSetIsValidating,
        setError: jest.fn(),
        reset: jest.fn(),
      });

      render(<EmailValidator />);

      expect(screen.getByTestId('validation-result')).toBeInTheDocument();
    });

    test('shows dimmed result during loading (prevents flashing)', () => {
      mockUseValidationStore.mockReturnValue({
        currentEmail: 'test@example.com',
        currentResult: mockValidationResult,
        isValidating: true,
        error: null,
        setEmail: mockSetEmail,
        setResult: mockSetResult,
        setIsValidating: mockSetIsValidating,
        setError: jest.fn(),
        reset: jest.fn(),
      });

      render(<EmailValidator />);

      // Result should still be shown during loading (dimmed) to prevent flashing
      // This is the new UX improvement - keep previous result visible
      expect(screen.queryByTestId('validation-result')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    test('handles API errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test('resets loading state on error', async () => {
      const user = userEvent.setup();
      jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'test@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(mockSetIsValidating).toHaveBeenLastCalledWith(false);
      });
    });
  });

  describe('real-time validation', () => {
    test('toggle is off by default', () => {
      render(<EmailValidator />);
      const toggle = screen.getByRole('switch');
      expect(toggle).not.toBeChecked();
    });

    test('toggle can be enabled', async () => {
      const user = userEvent.setup();
      render(<EmailValidator />);

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      expect(toggle).toBeChecked();
    });
  });

  describe('form validation', () => {
    test('prevents submission without valid email input', async () => {
      const user = userEvent.setup();
      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'invalid-email');

      const form = input.closest('form');
      expect(form).toBeInTheDocument();

      // Submit the form
      fireEvent.click(screen.getByText('Validate Email'));

      // API should not be called for invalid email (browser validation or zod prevents it)
      await waitFor(() => {
        // Either API was not called, or form validation prevented submission
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    test('submits valid email format', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResult,
      });

      render(<EmailValidator />);

      const input = screen.getByPlaceholderText('Enter email address...');
      await user.type(input, 'valid@example.com');

      fireEvent.click(screen.getByText('Validate Email'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });
});
