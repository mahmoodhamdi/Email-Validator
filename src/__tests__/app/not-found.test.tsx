import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';

describe('NotFound Page', () => {
  it('should render 404 heading', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  it('should display helpful message', () => {
    render(<NotFound />);

    expect(
      screen.getByText(/the page you're looking for doesn't exist/i)
    ).toBeInTheDocument();
  });

  it('should have link to home page', () => {
    render(<NotFound />);

    const homeLink = screen.getByRole('link', { name: /go home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('should have link to bulk validation', () => {
    render(<NotFound />);

    const bulkLink = screen.getByRole('link', { name: /bulk validate/i });
    expect(bulkLink).toHaveAttribute('href', '/bulk');
  });

  it('should have link to history page', () => {
    render(<NotFound />);

    const historyLink = screen.getByRole('link', { name: /view history/i });
    expect(historyLink).toHaveAttribute('href', '/history');
  });

  it('should have link to report issues', () => {
    render(<NotFound />);

    const reportLink = screen.getByRole('link', { name: /report the issue/i });
    expect(reportLink).toHaveAttribute('href', expect.stringContaining('github.com'));
    expect(reportLink).toHaveAttribute('target', '_blank');
  });
});
