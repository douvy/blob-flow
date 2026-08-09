import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer version', () => {
  it('links a release version to its GitHub release', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = '1.10.0';
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'v1.10.0' });
    expect(link).toHaveAttribute('href', 'https://github.com/douvy/blob-flow/releases/tag/v1.10.0');
  });

  it('links a dev build to its commit, without a v prefix', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = 'main-55953b0';
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'main-55953b0' });
    expect(link).toHaveAttribute('href', 'https://github.com/douvy/blob-flow/commit/55953b0');
  });
});
