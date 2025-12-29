import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '@/components/ErrorBoundary';

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Suppress console.error during tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render error UI when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render custom component name in error UI', () => {
      render(
        <ErrorBoundary componentName="Test Component">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error in Test Component')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom fallback')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should log error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('recovery', () => {
    it('should reset error state when Try Again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Rerender with non-throwing component before clicking retry
      // (simulating the error being fixed)
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      // Click Try Again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Should now show the normal content
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should show Clear Data & Reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /clear data/i })).toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent, 'Wrapped');

    render(<WrappedComponent />);

    expect(screen.getByText('Error in Wrapped')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render normally when no error', () => {
    function NormalComponent() {
      return <div>Normal content</div>;
    }

    const WrappedComponent = withErrorBoundary(NormalComponent, 'Normal');

    render(<WrappedComponent />);

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should have correct displayName', () => {
    function TestComponent() {
      return null;
    }

    const WrappedComponent = withErrorBoundary(TestComponent, 'Test');

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(Test)');
  });
});
