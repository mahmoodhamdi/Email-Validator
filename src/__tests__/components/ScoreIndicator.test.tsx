import { render, screen } from '@testing-library/react';
import { ScoreIndicator } from '@/components/email/ScoreIndicator';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    circle: ({ children, ...props }: React.ComponentProps<'circle'>) => (
      <circle {...props}>{children}</circle>
    ),
    span: ({ children, ...props }: React.ComponentProps<'span'>) => (
      <span {...props}>{children}</span>
    ),
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe('ScoreIndicator', () => {
  describe('renders correctly', () => {
    test('displays score value', () => {
      render(<ScoreIndicator score={85} />);
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    test('renders with default medium size', () => {
      const { container } = render(<ScoreIndicator score={50} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('w-24', 'h-24');
    });

    test('renders with small size', () => {
      const { container } = render(<ScoreIndicator score={50} size="sm" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('w-16', 'h-16');
    });

    test('renders with large size', () => {
      const { container } = render(<ScoreIndicator score={50} size="lg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('w-32', 'h-32');
    });
  });

  describe('color coding', () => {
    test('shows green for high scores (>= 80)', () => {
      render(<ScoreIndicator score={80} />);
      const scoreText = screen.getByText('80');
      expect(scoreText).toHaveClass('text-green-500');
    });

    test('shows green for perfect score', () => {
      render(<ScoreIndicator score={100} />);
      const scoreText = screen.getByText('100');
      expect(scoreText).toHaveClass('text-green-500');
    });

    test('shows amber for medium scores (50-79)', () => {
      render(<ScoreIndicator score={65} />);
      const scoreText = screen.getByText('65');
      expect(scoreText).toHaveClass('text-amber-500');
    });

    test('shows amber for score of exactly 50', () => {
      render(<ScoreIndicator score={50} />);
      const scoreText = screen.getByText('50');
      expect(scoreText).toHaveClass('text-amber-500');
    });

    test('shows red for low scores (< 50)', () => {
      render(<ScoreIndicator score={35} />);
      const scoreText = screen.getByText('35');
      expect(scoreText).toHaveClass('text-red-500');
    });

    test('shows red for zero score', () => {
      render(<ScoreIndicator score={0} />);
      const scoreText = screen.getByText('0');
      expect(scoreText).toHaveClass('text-red-500');
    });
  });

  describe('SVG rendering', () => {
    test('renders SVG circles', () => {
      const { container } = render(<ScoreIndicator score={75} />);
      const circles = container.querySelectorAll('circle');
      expect(circles).toHaveLength(2); // Background and progress circle
    });

    test('progress circle has correct stroke color for high score', () => {
      const { container } = render(<ScoreIndicator score={85} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveAttribute('stroke', '#22c55e');
    });

    test('progress circle has correct stroke color for medium score', () => {
      const { container } = render(<ScoreIndicator score={60} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveAttribute('stroke', '#f59e0b');
    });

    test('progress circle has correct stroke color for low score', () => {
      const { container } = render(<ScoreIndicator score={30} />);
      const progressCircle = container.querySelectorAll('circle')[1];
      expect(progressCircle).toHaveAttribute('stroke', '#ef4444');
    });
  });

  describe('edge cases', () => {
    test('handles boundary score of 79', () => {
      render(<ScoreIndicator score={79} />);
      const scoreText = screen.getByText('79');
      expect(scoreText).toHaveClass('text-amber-500');
    });

    test('handles boundary score of 49', () => {
      render(<ScoreIndicator score={49} />);
      const scoreText = screen.getByText('49');
      expect(scoreText).toHaveClass('text-red-500');
    });
  });
});
