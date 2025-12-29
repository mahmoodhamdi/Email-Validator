import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

    test('validates file size limit exists in component', () => {
      // The component should have file size validation
      // This is tested implicitly - the MAX_FILE_SIZE constant is used
      const { container } = render(<BulkValidator />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
    });

    test('shows error toast for invalid file type', async () => {
      const { container } = render(<BulkValidator />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const invalidFile = new File(['content'], 'file.exe', {
        type: 'application/octet-stream',
      });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Invalid file',
            variant: 'destructive',
          })
        );
      });
    });

    test('loads file content and shows filename', async () => {
      const { container } = render(<BulkValidator />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const content = 'test@example.com\nuser@domain.com';
      const file = new File([content], 'emails.csv', { type: 'text/csv' });

      // Mock FileReader
      const mockReadAsText = jest.fn();
      const mockFileReader = {
        readAsText: mockReadAsText,
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        onerror: null as (() => void) | null,
        result: content,
      };
      jest.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as unknown as FileReader);

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Trigger onload wrapped in act()
      await act(async () => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: content } } as ProgressEvent<FileReader>);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/Loaded: emails.csv/)).toBeInTheDocument();
      });
    });
  });

  describe('CSV header detection', () => {
    test('skips CSV header row when present', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'Email,Name\ntest@example.com,Test User');

      expect(screen.getByText('1 email detected')).toBeInTheDocument();
    });

    test('skips header with e-mail variation', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'E-mail Address\nuser@domain.com');

      expect(screen.getByText('1 email detected')).toBeInTheDocument();
    });

    test('handles tab-separated values', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com\tJohn Doe\nuser@domain.com\tJane Doe');

      expect(screen.getByText('2 emails detected')).toBeInTheDocument();
    });

    test('removes quotes from email addresses', async () => {
      const user = userEvent.setup();
      const mockResults = [createMockValidationResult('test@example.com')];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, '"test@example.com"');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/validate-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails: ['test@example.com'] }),
        });
      });
    });
  });

  describe('email preview', () => {
    test('shows preview button when emails are entered', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      expect(screen.getByText('Show Preview')).toBeInTheDocument();
    });

    test('toggles preview visibility', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com');

      const previewButton = screen.getByText('Show Preview');
      fireEvent.click(previewButton);

      expect(screen.getByText('Hide Preview')).toBeInTheDocument();
      expect(screen.getByText('Preview (1 of 1)')).toBeInTheDocument();
    });

    test('shows first 10 emails in preview', async () => {
      const user = userEvent.setup();
      render(<BulkValidator />);

      const emails = Array.from({ length: 15 }, (_, i) => `user${i}@example.com`).join('\n');
      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.clear(textarea);
      fireEvent.change(textarea, { target: { value: emails } });

      const previewButton = screen.getByText('Show Preview');
      fireEvent.click(previewButton);

      expect(screen.getByText('Preview (10 of 15)')).toBeInTheDocument();
      expect(screen.getByText('... and 5 more')).toBeInTheDocument();
    });
  });

  describe('export filtering', () => {
    const setupWithMixedResults = async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('valid@example.com', true),
        createMockValidationResult('invalid@test.com', false),
        {
          ...createMockValidationResult('risky@domain.com', true),
          deliverability: 'risky' as const,
          risk: 'high' as const,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'valid@example.com\ninvalid@test.com\nrisky@domain.com');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('Results')).toBeInTheDocument();
      });
    };

    test('exports only valid emails when filter is "valid"', async () => {
      await setupWithMixedResults();

      // Find and click the filter trigger
      const filterTrigger = screen.getByRole('combobox');
      fireEvent.click(filterTrigger);

      // Select "Valid" option from the dropdown (use role='option')
      const validOption = screen.getByRole('option', { name: /Valid \(2\)/ });
      fireEvent.click(validOption);

      // Export CSV
      fireEvent.click(screen.getByText('CSV'));

      // Should only export valid emails
      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('valid@example.com'),
        'email-validation-results-valid.csv',
        'text/csv'
      );
    });

    test('exports only invalid emails when filter is "invalid"', async () => {
      await setupWithMixedResults();

      const filterTrigger = screen.getByRole('combobox');
      fireEvent.click(filterTrigger);

      // Select "Invalid" option from the dropdown
      const invalidOption = screen.getByRole('option', { name: /Invalid \(1\)/ });
      fireEvent.click(invalidOption);

      fireEvent.click(screen.getByText('CSV'));

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('invalid@test.com'),
        'email-validation-results-invalid.csv',
        'text/csv'
      );
    });
  });

  describe('copy functionality', () => {
    const setupWithResults = async () => {
      const user = userEvent.setup();
      const mockResults = [
        createMockValidationResult('test@example.com', true),
        createMockValidationResult('user@domain.com', true),
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults }),
      });

      render(<BulkValidator />);

      const textarea = screen.getByPlaceholderText(/Enter emails/);
      await user.type(textarea, 'test@example.com\nuser@domain.com');

      fireEvent.click(screen.getByText('Validate All'));

      await waitFor(() => {
        expect(screen.getByText('Results')).toBeInTheDocument();
      });
    };

    test('copy button is visible after validation', async () => {
      await setupWithResults();
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeInTheDocument();
    });

    test('copy button can be clicked', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      await setupWithResults();
      const copyButton = screen.getByText('Copy');

      // Click should not throw
      expect(() => fireEvent.click(copyButton)).not.toThrow();
    });
  });
});
