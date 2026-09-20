import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_NETWORK } from '@/constants';
import { useNetwork } from '@/hooks/useNetwork';
import type { BlockBuilderResponse } from '@/types';
import BuilderTag from './BuilderTag';

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

function makeBuilder(overrides: Partial<BlockBuilderResponse> = {}): BlockBuilderResponse {
  return {
    key: 'builder:titan',
    name: 'Titan Builder',
    known: true,
    fee_recipient: '0x1234567890abcdef1234567890abcdef12345678',
    extra_data: '0x546974616e',
    extra_data_text: 'Titan',
    tx_count: 180,
    candidate_snapshot: true,
    ...overrides,
  };
}

describe('BuilderTag', () => {
  beforeEach(() => {
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
  });

  it('renders nothing without a builder', () => {
    const { container } = render(<BuilderTag />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links a known builder to its page', () => {
    render(<BuilderTag builder={makeBuilder()} />);

    const link = screen.getByRole('link', { name: 'Titan Builder' });
    expect(link).toHaveAttribute('href', '/builder/builder%3Atitan');
    expect(link).toHaveClass('text-blue');
  });

  it('falls back to the key when the builder has no name', () => {
    render(<BuilderTag builder={makeBuilder({ name: '  ' })} />);

    expect(screen.getByRole('link', { name: 'builder:titan' })).toBeInTheDocument();
  });

  it('marks an unregistered builder with where its key came from', () => {
    const { rerender } = render(<BuilderTag builder={makeBuilder({ known: false })} />);

    expect(screen.getByTitle('Unregistered builder: derived from extra data')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Titan Builder' })).toHaveClass('font-mono');

    // The key prefix, not the raw extra data, says which fallback the indexer
    // took: binary extra data can be present and still unusable.
    rerender(
      <BuilderTag
        builder={makeBuilder({
          known: false,
          key: 'addr:0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97',
          extra_data: '0xdeadbeef',
          extra_data_text: undefined,
        })}
      />
    );

    expect(
      screen.getByTitle('Unregistered builder: derived from fee recipient')
    ).toBeInTheDocument();
  });

  it('keeps a click off the clickable row around it', () => {
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick} role="presentation">
        <BuilderTag builder={makeBuilder()} compact />
      </div>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Titan Builder' }));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
