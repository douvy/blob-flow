import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_NETWORK } from '@/constants';
import { useNetwork } from '@/hooks/useNetwork';
import { useTopUsers } from '@/hooks/useTopUsers';
import { KIOSK_CONTROL_IDLE_MS } from '@/lib/liveKiosk';
import KioskControls from './KioskControls';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/live'),
  useSearchParams: vi.fn(),
}));

vi.mock('@/hooks/useNetwork', () => ({
  useNetwork: vi.fn(),
}));

vi.mock('@/hooks/useTopUsers', () => ({
  useTopUsers: vi.fn(),
}));

// Radix's Select relies on pointer APIs jsdom lacks. These stubs keep the
// tests on what this component owns: visibility, URL sync, network switching.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onOpenChange,
    onValueChange,
  }: {
    children: React.ReactNode;
    onOpenChange: (open: boolean) => void;
    onValueChange: (value: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange(true)}>
        open menu
      </button>
      <button type="button" onClick={() => onOpenChange(false)}>
        close menu
      </button>
      {children}
      <input
        data-testid="value-select"
        onChange={(event) => onValueChange(event.target.value)}
      />
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

function getShell(): HTMLElement {
  return screen
    .getByLabelText('Select network')
    .closest('div[class*="transition-opacity"]') as HTMLElement;
}

const replace = vi.fn();

describe('KioskControls', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(useRouter).mockReset();
    vi.mocked(useSearchParams).mockReset();
    vi.mocked(useNetwork).mockReset();
    vi.mocked(useTopUsers).mockReset();

    vi.mocked(useRouter).mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork: vi.fn(),
      networkOptions: [DEFAULT_NETWORK],
    });
    vi.mocked(useTopUsers).mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            name: 'Base',
            address: '0x1',
            attributed: true,
            dataCount: 10,
            percentage: 50,
            totalCostEth: '1',
            lastTimestamp: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            name: '0x12…34',
            address: '0x1234',
            attributed: false,
            dataCount: 5,
            percentage: 25,
            totalCostEth: '1',
            lastTimestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
        hasServerShares: true,
      },
      isLoading: false,
      error: null,
      scopeKey: 'mainnet:24h',
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts hidden and inert so an unattended screen shows no controls', () => {
    render(<KioskControls />);

    const shell = getShell();
    expect(shell).toHaveClass('opacity-0');
    expect(shell).toHaveClass('pointer-events-none');
    expect(shell).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByLabelText('Select network')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByLabelText('Focus on a rollup')).toHaveAttribute('tabindex', '-1');
  });

  it('reveals on activity and hides again once the display goes idle', () => {
    render(<KioskControls />);

    act(() => {
      fireEvent.pointerMove(window);
    });

    expect(getShell()).toHaveClass('opacity-100');

    act(() => {
      vi.advanceTimersByTime(KIOSK_CONTROL_IDLE_MS + 100);
    });

    expect(getShell()).toHaveClass('opacity-0');
  });

  it('stays visible while either menu is open, then resumes the countdown', () => {
    render(<KioskControls />);

    act(() => {
      fireEvent.click(screen.getAllByText('open menu')[0]);
    });
    act(() => {
      vi.advanceTimersByTime(KIOSK_CONTROL_IDLE_MS * 3);
    });

    expect(getShell()).toHaveClass('opacity-100');

    act(() => {
      fireEvent.click(screen.getAllByText('close menu')[0]);
    });
    act(() => {
      vi.advanceTimersByTime(KIOSK_CONTROL_IDLE_MS + 100);
    });

    expect(getShell()).toHaveClass('opacity-0');
  });

  it('lists only attributed rollups in the focus picker', () => {
    render(<KioskControls />);

    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.queryByText('0x12…34')).not.toBeInTheDocument();
  });

  it('keeps a URL-supplied focus selectable even when it is not in the top list', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('focus=Scroll') as unknown as ReturnType<typeof useSearchParams>
    );

    render(<KioskControls />);

    expect(screen.getByText('Scroll')).toBeInTheDocument();
  });

  it('writes the chosen focus to the URL and clears it for "all rollups"', () => {
    render(<KioskControls />);

    const [focusSelect] = screen.getAllByTestId('value-select');
    fireEvent.change(focusSelect, { target: { value: 'Base' } });
    expect(replace).toHaveBeenCalledWith('/live?focus=Base', { scroll: false });

    fireEvent.change(focusSelect, { target: { value: '__all__' } });
    expect(replace).toHaveBeenCalledWith('/live', { scroll: false });
  });

  it('switches network when a new value is chosen', () => {
    const setSelectedNetwork = vi.fn();
    const other = { name: 'Sepolia', apiParam: 'sepolia' };
    vi.mocked(useNetwork).mockReturnValue({
      selectedNetwork: DEFAULT_NETWORK,
      setSelectedNetwork,
      networkOptions: [DEFAULT_NETWORK, other],
    });

    render(<KioskControls />);

    const selects = screen.getAllByTestId('value-select');
    fireEvent.change(selects[1], { target: { value: 'sepolia' } });

    expect(setSelectedNetwork).toHaveBeenCalledWith(other);
  });
});
