import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationHistory } from '@/components/email/ValidationHistory';
import { useHistoryStore } from '@/stores/history-store';
import type { HistoryItem } from '@/types/email';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, ...props }: React.ComponentProps<'div'> & { layout?: boolean }) => (
      <div data-layout={layout} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the history store
jest.mock('@/stores/history-store');
const mockUseHistoryStore = useHistoryStore as jest.MockedFunction<typeof useHistoryStore>;

// Mock formatDate utility
const mockDownloadFile = jest.fn();
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
  downloadFile: (...args: unknown[]) => mockDownloadFile(...args),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
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
    mockDownloadFile.mockClear();
    mockToast.mockClear();
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

      // New format: "X of Y validation(s) shown"
      expect(screen.getByText(/3 of 3 validations shown/)).toBeInTheDocument();
    });

    test('shows singular form for one item', () => {
      const items = [createMockHistoryItem({ id: '1' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // New format: "X of Y validation shown"
      expect(screen.getByText(/1 of 1 validation shown/)).toBeInTheDocument();
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

      render(<ValidationHistory />);

      // Find the delete button by title
      const deleteButton = screen.getByTitle('Remove');
      fireEvent.click(deleteButton);

      expect(mockRemoveItem).toHaveBeenCalledWith('item-to-delete');
    });

    test('calls onRevalidate when revalidate button is clicked', () => {
      const mockOnRevalidate = jest.fn();
      const items = [createMockHistoryItem({ id: '1', email: 'test@example.com' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory onRevalidate={mockOnRevalidate} />);

      // Find the revalidate button by title
      const revalidateButton = screen.getByTitle('Revalidate');
      fireEvent.click(revalidateButton);

      expect(mockOnRevalidate).toHaveBeenCalledWith('test@example.com');
    });

    test('does not show revalidate button when onRevalidate is not provided', () => {
      const items = [createMockHistoryItem({ id: '1' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // Revalidate button should not exist
      expect(screen.queryByTitle('Revalidate')).not.toBeInTheDocument();
    });
  });

  describe('search and filter', () => {
    test('shows filter panel when Filters button is clicked', () => {
      const items = [createMockHistoryItem({ id: '1' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      const filtersButton = screen.getByText('Filters');
      fireEvent.click(filtersButton);

      expect(screen.getByPlaceholderText('Search by email or domain...')).toBeInTheDocument();
    });

    test('filters items by search query', async () => {
      const user = userEvent.setup();
      const items = [
        createMockHistoryItem({ id: '1', email: 'john@gmail.com' }),
        createMockHistoryItem({ id: '2', email: 'jane@yahoo.com' }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      const { container } = render(<ValidationHistory />);

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      // Type in search
      const searchInput = screen.getByPlaceholderText('Search by email or domain...');
      await user.type(searchInput, 'john');

      // Text may be broken up by highlight marks, so check the full content
      const emailElements = container.querySelectorAll('.truncate.text-sm.font-medium');
      const emails = Array.from(emailElements).map(el => el.textContent);

      // Only matching item should be shown
      expect(emails).toContain('john@gmail.com');
      expect(emails).not.toContain('jane@yahoo.com');
    });

    test('filters items by validity', async () => {
      const items = [
        createMockHistoryItem({ id: '1', email: 'valid@example.com', isValid: true }),
        createMockHistoryItem({ id: '2', email: 'invalid@test.com', isValid: false }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      // Find and click the validity filter dropdown
      const validityTrigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(validityTrigger);

      // Select "Valid" option
      const validOption = screen.getByRole('option', { name: 'Valid' });
      fireEvent.click(validOption);

      // Only valid item should be shown
      expect(screen.getByText('valid@example.com')).toBeInTheDocument();
      expect(screen.queryByText('invalid@test.com')).not.toBeInTheDocument();
    });

    test('shows no results message when filters match nothing', async () => {
      const user = userEvent.setup();
      const items = [createMockHistoryItem({ id: '1', email: 'test@example.com' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      // Type search that won't match
      const searchInput = screen.getByPlaceholderText('Search by email or domain...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No results match your filters')).toBeInTheDocument();
    });
  });

  describe('export functionality', () => {
    test('exports items to CSV', () => {
      const items = [
        createMockHistoryItem({ id: '1', email: 'test@example.com' }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
        'validation-history.csv',
        'text/csv'
      );
    });

    test('exports items to JSON', () => {
      const items = [
        createMockHistoryItem({ id: '1', email: 'test@example.com' }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      const jsonButton = screen.getByText('JSON');
      fireEvent.click(jsonButton);

      expect(mockDownloadFile).toHaveBeenCalledWith(
        expect.any(String),
        'validation-history.json',
        'application/json'
      );
    });

    test('shows toast when no items to export', async () => {
      const user = userEvent.setup();
      const items = [createMockHistoryItem({ id: '1', email: 'test@example.com' })];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // Open filters and search for nonexistent
      fireEvent.click(screen.getByText('Filters'));
      const searchInput = screen.getByPlaceholderText('Search by email or domain...');
      await user.type(searchInput, 'nonexistent');

      // Try to export
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'No items to export',
          variant: 'destructive',
        })
      );
    });
  });

  describe('pagination', () => {
    test('shows pagination when items exceed page size', () => {
      // Create 25 items (exceeds default 20 per page)
      const items = Array.from({ length: 25 }, (_, i) =>
        createMockHistoryItem({ id: `item-${i}`, email: `user${i}@example.com` })
      );

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    test('navigates to next page', () => {
      const items = Array.from({ length: 25 }, (_, i) =>
        createMockHistoryItem({ id: `item-${i}`, email: `user${i}@example.com` })
      );

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    test('disables Previous button on first page', () => {
      const items = Array.from({ length: 25 }, (_, i) =>
        createMockHistoryItem({ id: `item-${i}`, email: `user${i}@example.com` })
      );

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });

    test('disables Next button on last page', () => {
      const items = Array.from({ length: 25 }, (_, i) =>
        createMockHistoryItem({ id: `item-${i}`, email: `user${i}@example.com` })
      );

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // Go to last page
      fireEvent.click(screen.getByText('Next'));

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('sorting', () => {
    test('sorts by date by default (newest first)', () => {
      const items = [
        createMockHistoryItem({ id: '1', email: 'old@example.com', timestamp: '2024-01-01T00:00:00Z' }),
        createMockHistoryItem({ id: '2', email: 'new@example.com', timestamp: '2024-01-15T00:00:00Z' }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      const { container } = render(<ValidationHistory />);

      // Get all email elements in order
      const emailElements = container.querySelectorAll('.truncate.text-sm.font-medium');
      const emails = Array.from(emailElements).map(el => el.textContent);

      // Newest should be first
      expect(emails[0]).toBe('new@example.com');
      expect(emails[1]).toBe('old@example.com');
    });

    test('toggles sort order', () => {
      const items = [
        createMockHistoryItem({ id: '1', email: 'a@example.com' }),
        createMockHistoryItem({ id: '2', email: 'z@example.com' }),
      ];

      mockUseHistoryStore.mockReturnValue({
        items,
        removeItem: mockRemoveItem,
        clearHistory: mockClearHistory,
      });

      render(<ValidationHistory />);

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      // Click the sort order button to toggle
      const sortOrderButton = screen.getByText('Desc');
      fireEvent.click(sortOrderButton);

      expect(screen.getByText('Asc')).toBeInTheDocument();
    });
  });
});
