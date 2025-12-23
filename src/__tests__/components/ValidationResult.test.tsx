import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ValidationResult } from '@/components/email/ValidationResult';
import type { ValidationResult as ValidationResultType } from '@/types/email';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock the ScoreIndicator component
jest.mock('@/components/email/ScoreIndicator', () => ({
  ScoreIndicator: ({ score }: { score: number }) => (
    <div data-testid="score-indicator">{score}</div>
  ),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock utils
const mockCopyToClipboard = jest.fn();
const mockDownloadFile = jest.fn();
jest.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

const createMockResult = (overrides: Partial<ValidationResultType> = {}): ValidationResultType => ({
  email: 'test@example.com',
  isValid: true,
  score: 85,
  checks: {
    syntax: { valid: true, message: 'Email syntax is valid' },
    domain: { valid: true, exists: true, message: 'Domain format is valid' },
    mx: { valid: true, records: ['mx1.example.com', 'mx2.example.com'], message: 'MX records found' },
    disposable: { isDisposable: false, message: 'Not a disposable email' },
    roleBased: { isRoleBased: false, role: null },
    freeProvider: { isFree: false, provider: null },
    typo: { hasTypo: false, suggestion: null },
    blacklisted: { isBlacklisted: false, lists: [] },
    catchAll: { isCatchAll: false },
  },
  deliverability: 'deliverable',
  risk: 'low',
  timestamp: '2024-01-15T10:30:00Z',
  ...overrides,
});

describe('ValidationResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('displays email address', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    test('displays score indicator', () => {
      render(<ValidationResult result={createMockResult({ score: 90 })} />);
      expect(screen.getByTestId('score-indicator')).toHaveTextContent('90');
    });

    test('displays valid badge for valid email', () => {
      render(<ValidationResult result={createMockResult({ isValid: true })} />);
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    test('displays invalid badge for invalid email', () => {
      render(<ValidationResult result={createMockResult({ isValid: false })} />);
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });

    test('displays deliverability status', () => {
      render(<ValidationResult result={createMockResult({ deliverability: 'deliverable' })} />);
      expect(screen.getByText('deliverable')).toBeInTheDocument();
    });

    test('displays risk level', () => {
      render(<ValidationResult result={createMockResult({ risk: 'low' })} />);
      expect(screen.getByText('low risk')).toBeInTheDocument();
    });
  });

  describe('check items', () => {
    test('displays syntax check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Syntax')).toBeInTheDocument();
    });

    test('displays domain check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Domain')).toBeInTheDocument();
    });

    test('displays MX Records check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('MX Records')).toBeInTheDocument();
    });

    test('displays disposable check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Disposable')).toBeInTheDocument();
    });

    test('displays role-based check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Role-Based')).toBeInTheDocument();
    });

    test('displays free provider info', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Free Provider')).toBeInTheDocument();
    });

    test('displays blacklist check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Blacklist')).toBeInTheDocument();
    });

    test('displays catch-all check', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.getByText('Catch-All')).toBeInTheDocument();
    });

    test('displays typo suggestion when typo detected', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          typo: { hasTypo: true, suggestion: 'gmail.com' },
        },
      });
      result.email = 'test@gmial.com';

      render(<ValidationResult result={result} />);
      expect(screen.getByText('Typo Detected')).toBeInTheDocument();
    });
  });

  describe('special states', () => {
    test('shows disposable warning when email is disposable', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          disposable: { isDisposable: true, message: 'Disposable email detected' },
        },
      });

      render(<ValidationResult result={result} />);
      expect(screen.getByText('Disposable email detected')).toBeInTheDocument();
    });

    test('shows role-based info when email is role-based', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          roleBased: { isRoleBased: true, role: 'support' },
        },
      });

      render(<ValidationResult result={result} />);
      expect(screen.getByText('Role: support')).toBeInTheDocument();
    });

    test('shows free provider name when detected', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          freeProvider: { isFree: true, provider: 'Gmail' },
        },
      });

      render(<ValidationResult result={result} />);
      expect(screen.getByText('Provider: Gmail')).toBeInTheDocument();
    });

    test('shows blacklist info when blacklisted', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          blacklisted: { isBlacklisted: true, lists: ['spamhaus', 'barracuda'] },
        },
      });

      render(<ValidationResult result={result} />);
      expect(screen.getByText(/Listed on:/)).toBeInTheDocument();
    });

    test('shows catch-all info when domain accepts all emails', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          catchAll: { isCatchAll: true },
        },
      });

      render(<ValidationResult result={result} />);
      expect(screen.getByText('Domain accepts all emails')).toBeInTheDocument();
    });

    test('shows MX records list', () => {
      const result = createMockResult({
        checks: {
          ...createMockResult().checks,
          mx: { valid: true, records: ['mx1.example.com', 'mx2.example.com'], message: 'Found' },
        },
      });

      render(<ValidationResult result={result} />);
      expect(screen.getByText('mx1.example.com, mx2.example.com')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    test('copy button triggers clipboard copy', async () => {
      mockCopyToClipboard.mockResolvedValue(undefined);

      render(<ValidationResult result={createMockResult()} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockCopyToClipboard).toHaveBeenCalled();
      });
    });

    test('shows success toast on successful copy', async () => {
      mockCopyToClipboard.mockResolvedValue(undefined);

      render(<ValidationResult result={createMockResult()} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Copied to clipboard',
            variant: 'success',
          })
        );
      });
    });

    test('shows error toast on failed copy', async () => {
      mockCopyToClipboard.mockRejectedValue(new Error('Copy failed'));

      render(<ValidationResult result={createMockResult()} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Failed to copy',
            variant: 'destructive',
          })
        );
      });
    });

    test('export button triggers file download', () => {
      render(<ValidationResult result={createMockResult({ email: 'user@test.com' })} />);

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.any(String),
        'email-validation-user@test.com.json',
        'application/json'
      );
    });

    test('shows success toast on export', () => {
      render(<ValidationResult result={createMockResult({ email: 'user@test.com' })} />);

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Exported successfully',
          variant: 'success',
        })
      );
    });
  });

  describe('typo warning', () => {
    test('shows typo warning banner when typo detected', () => {
      const result = createMockResult({
        email: 'test@gmial.com',
        checks: {
          ...createMockResult().checks,
          typo: { hasTypo: true, suggestion: 'gmail.com' },
        },
      });

      render(<ValidationResult result={result} />);
      // "Did you mean" appears in both the check item and the warning banner
      const didYouMeanElements = screen.getAllByText(/Did you mean/);
      expect(didYouMeanElements.length).toBeGreaterThan(0);
      expect(screen.getByText('test@gmail.com')).toBeInTheDocument();
    });

    test('does not show typo warning when no typo', () => {
      render(<ValidationResult result={createMockResult()} />);
      expect(screen.queryByText(/Did you mean/)).not.toBeInTheDocument();
    });
  });
});
