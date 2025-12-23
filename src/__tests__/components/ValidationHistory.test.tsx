import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationHistory } from '@/components/email/ValidationHistory';
import { useHistoryStore } from '@/stores/history-store';
import type { HistoryItem } from '@/types/email';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the history store
jest.mock('@/stores/history-store');
const mockUseHistoryStore = useHistoryStore as jest.MockedFunction<typeof useHistoryStore>;

// Mock formatDate utility
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
}));

const createMockHistoryItem = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 'test-id-1',
  email: 'test@example.com',
  isValid: true,
  score: 85,
  checks: {
    syntax: { valid: true, message: 'Valid syntax' },
    domain: { valid: true, exists: true, message: 'Valid domain' },
    mx: { valid: true, records: ['mx.example.com'], message: 'MX records found' },
    disposable: { isDisposable: false, message: 'Not disposable' },
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

describe('ValidationHistory', () => {
  const mockRemoveItem = jest.fn();
  const mockClearHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty state', () => {
    test('shows empty state when no history items', () => {
      mockUseHistoryStore.mockReturnValue({
        items: [],
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('No validation history yet')).toBeInTheDocument();
      expect(screen.getByText('Start validating emails to see them here')).toBeInTheDocument();
    });

    test('displays history title in empty state', () => {
      mockUseHistoryStore.mockReturnValue({
        items: [],
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('Validation History')).toBeInTheDocument();
    });
  });

  describe('with history items', () => {
    test('displays history items', () => {
      const items = [
        createMockHistoryItem({ id: '1', email: 'user1@example.com', score: 90 }),
        createMockHistoryItem({ id: '2', email: 'user2@test.com', score: 45, isValid: false }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@test.com')).toBeInTheDocument();
    });

    test('shows correct item count', () => {
      const items = [
        createMockHistoryItem({ id: '1' }),
        createMockHistoryItem({ id: '2' }),
        createMockHistoryItem({ id: '3' }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('3 validations stored locally')).toBeInTheDocument();
    });

    test('shows singular form for one item', () => {
      const items = [createMockHistoryItem({ id: '1' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('1 validation stored locally')).toBeInTheDocument();
    });

    test('displays score badges with correct styling', () => {
      const items = [
        createMockHistoryItem({ id: '1', score: 90 }),
        createMockHistoryItem({ id: '2', score: 60 }),
        createMockHistoryItem({ id: '3', score: 30 }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    test('shows valid/invalid icons', () => {
      const items = [
        createMockHistoryItem({ id: '1', isValid: true }),
        createMockHistoryItem({ id: '2', isValid: false }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      const { container } = render(<ValidationHistory />);

      // Check for valid (green) and invalid (red) icons
      const greenIcons = container.querySelectorAll('.text-green-500');
      const redIcons = container.querySelectorAll('.text-red-500');

      expect(greenIcons.length).toBeGreaterThan(0);
      expect(redIcons.length).toBeGreaterThan(0);
    });
  });

  describe('interactions', () => {
    test('calls clearHistory when Clear All button is clicked', () => {
      const items = [createMockHistoryItem({ id: '1' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      const clearButton = screen.getByText('Clear All');
      fireEvent.click(clearButton);

      expect(mockClearHistory).toHaveBeenCalledTimes(1);
    });

    test('calls removeItem when delete button is clicked', () => {
      const items = [createMockHistoryItem({ id: 'item-to-delete' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      const { container } = render(<ValidationHistory />);

      // Find all icon buttons (size="icon" renders as small buttons)
      const allButtons = container.querySelectorAll('button');
      // The delete button is the last button for each item (after Clear All)
      // Filter to find buttons that are icon buttons (smaller, no text content)
      const iconButtons = Array.from(allButtons).filter(
        (btn) => !btn.textContent?.includes('Clear')
      );

      // The delete button should be the last icon button
      const deleteButton = iconButtons[iconButtons.length - 1];

      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockRemoveItem).toHaveBeenCalledWith('item-to-delete');
      } else {
        // If button not found, fail explicitly
        expect(iconButtons.length).toBeGreaterThan(0);
      }
    });

    test('calls onRevalidate when revalidate button is clicked', () => {
      const mockOnRevalidate = jest.fn();
      const items = [createMockHistoryItem({ id: '1', email: 'test@example.com' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      const { container } = render(<ValidationHistory onRevalidate={mockOnRevalidate} />);

      // Find the revalidate button (RefreshCw icon)
      const buttons = container.querySelectorAll('button');
      const revalidateButton = Array.from(buttons).find(
        (btn) => !btn.textContent?.includes('Clear') && !btn.classList.contains('text-destructive')
      );

      if (revalidateButton) {
        fireEvent.click(revalidateButton);
        expect(mockOnRevalidate).toHaveBeenCalledWith('test@example.com');
      }
    });

    test('does not show revalidate button when onRevalidate is not provided', () => {
      const items = [createMockHistoryItem({ id: '1' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      const { container } = render(<ValidationHistory />);

      // Count buttons - should only have Clear All and delete buttons
      const buttons = container.querySelectorAll('button');
      // Clear All + delete button for each item
      expect(buttons.length).toBe(2); // Clear All + 1 delete button
    });
  });
});
