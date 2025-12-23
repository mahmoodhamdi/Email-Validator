import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkValidator } from '@/components/email/BulkValidator';
import type { ValidationResult } from '@/types/email';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock downloadFile
const mockDownloadFile = jest.fn();
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

const createMockValidationResult = (email: string, isValid = true): ValidationResult => ({
  email,
  isValid,
  score: isValid ? 85 : 30,
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
  deliverability: isValid ? 'deliverable' : 'undeliverable',
  risk: isValid ? 'low' : 'high',
  timestamp: new Date().toISOString(),
});

describe('BulkValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('initial render', () => {
    test('renders bulk validation form', () => {
      render(<BulkValidator />);

      expect(screen.getByText('Bulk Email Validation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter emails/)).toBeInTheDocument();
      expect(screen.getByText('Upload File')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Validate All')).toBeInTheDocument();
    });

    test('shows 0 emails detected initially', () => {
      render(<BulkValidator />);
      expect(screen.getByText('0 emails detected')).toBeInTheDocument();
    });

    test('validate button is disabled when no emails', () => {
      render(<BulkValidator />);
      const validateButton = screen.getByText('Validate All');
      expect(validateButton).toBeDisabled();
    });
  });

  describe('email parsing', () => {
    test('counts emails entered in textarea', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test1@example.com\ntest2@example.com');

      expect(screen.getByText('2 emails detected')).toBeInTheDocument();
    });

    test('handles comma-separated emails', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test1@example.com, test2@example.com');

      expect(screen.getByText('2 emails detected')).toBeInTheDocument();
    });

    test('handles semicolon-separated emails', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test1@example.com; test2@example.com');

      expect(screen.getByText('2 emails detected')).toBeInTheDocument();
    });

    test('removes duplicates', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com\ntest@example.com');

      expect(screen.getByText('1 email detected')).toBeInTheDocument();
    });

    test('ignores lines without @ symbol', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com\ninvalid line\nanother@test.com');

      expect(screen.getByText('2 emails detected')).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    test('calls API with emails on validate', async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('test@example.com'),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      const validateButton = screen.getByText('Validate All');
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/validate-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: ['test@example.com'] }),
        });
      });
    });

    test('shows loading state during validation', async () => {
      const user = userEvent.setup();

      // Never resolve to keep loading state
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      const validateButton = screen.getByText('Validate All');
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('Validating...')).toBeInTheDocument();
      });
    });

    test('displays results after successful validation', async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('valid@example.com', true),
        createMockValidationResult('invalid@test.com', false),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'valid@example.com\ninvalid@test.com');

      const validateButton = screen.getByText('Validate All');
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText('Results')).toBeInTheDocument();
        expect(screen.getByText('valid@example.com')).toBeInTheDocument();
        expect(screen.getByText('invalid@test.com')).toBeInTheDocument();
      });
    });

    test('shows count badges after validation', async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('valid@example.com', true),
        createMockValidationResult('invalid@test.com', false),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'valid@example.com\ninvalid@test.com');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('1 Valid')).toBeInTheDocument();
        expect(screen.getByText('1 Invalid')).toBeInTheDocument();
      });
    });

    test('shows success toast on completion', async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('test@example.com', true),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Validation complete',
          })
        );
      });
    });

    test('shows error toast on API failure', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Validation failed',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('export functionality', () => {
    const setupWithResults = async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('test@example.com', true),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('Results')).toBeInTheDocument();
      });
    };

    test('exports results as CSV', async () => {
      await setupWithResults();

      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('Email'),
        'email-validation-results.csv',
        'text/csv'
      );
    });

    test('exports results as JSON', async () => {
      await setupWithResults();

      const jsonButton = screen.getByText('JSON');
      fireEvent.click(jsonButton);

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.any(String),
        'email-validation-results.json',
        'application/json'
      );
    });

    test('shows toast on successful export', async () => {
      await setupWithResults();

      fireEvent.click(screen.getByText('CSV'));

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Exported to CSV',
          variant: 'success',
        })
      );
    });
  });

  describe('clear functionality', () => {
    test('clears textarea on clear button click', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      expect(textarea).toHaveValue('test@example.com');

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(textarea).toHaveValue('');
    });

    test('clear button is disabled when empty', () => {
      render(<BulkValidator />);

      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('file upload', () => {
    test('upload button is present', () => {
      render(<BulkValidator />);
      expect(screen.getByText('Upload File')).toBeInTheDocument();
    });

    test('file input accepts csv and txt files', () => {
      const { container } = render(<BulkValidator />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', '.csv,.txt');
    });
  });
});
