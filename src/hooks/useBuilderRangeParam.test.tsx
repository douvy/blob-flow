import { act, renderHook } from '@testing-library/react';
import { useBuilderRangeParam } from './useBuilderRangeParam';
import { trackEvent } from '@/lib/analytics';
import { DEFAULT_BUILDER_RANGE } from '@/lib/builders';

const routerReplace = vi.fn();
const searchParams = { value: new URLSearchParams() };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
  usePathname: () => '/builders',
  useSearchParams: () => searchParams.value,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

function renderRangeParam(query = '') {
  searchParams.value = new URLSearchParams(query);
  return renderHook(() => useBuilderRangeParam());
}

describe('useBuilderRangeParam', () => {
  beforeEach(() => {
    // The repo's setup never clears module mock call counts between tests.
    routerReplace.mockReset();
    vi.mocked(trackEvent).mockReset();
  });

  it('falls back to the default window without a param', () => {
    expect(renderRangeParam().result.current.range).toBe(DEFAULT_BUILDER_RANGE);
  });

  it('opens on the window a shared link carries', () => {
    expect(renderRangeParam('range=7d').result.current.range).toBe('7d');
  });

  it('ignores a window the builder endpoints do not serve', () => {
    // 'all' is a valid range elsewhere in the app, but the builder endpoints
    // reject it with a 400, so it is treated like any other unusable value.
    expect(renderRangeParam('range=all').result.current.range).toBe(DEFAULT_BUILDER_RANGE);
    expect(renderRangeParam('range=2w').result.current.range).toBe(DEFAULT_BUILDER_RANGE);
    expect(renderRangeParam('range=').result.current.range).toBe(DEFAULT_BUILDER_RANGE);
  });

  it('rewrites the URL when a window is picked, keeping unrelated params', () => {
    const { result } = renderRangeParam('utm_source=x');

    act(() => result.current.setRange('30d'));

    expect(routerReplace).toHaveBeenCalledWith('/builders?utm_source=x&range=30d', {
      scroll: false,
    });
    expect(trackEvent).toHaveBeenCalledWith('time-range-change', {
      range: '30d',
      previous: DEFAULT_BUILDER_RANGE,
    });
  });

  it('does nothing when the window already on screen is picked again', () => {
    const { result } = renderRangeParam('range=7d');

    act(() => result.current.setRange('7d'));

    expect(routerReplace).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('follows the address bar when history swaps the param', () => {
    const { result, rerender } = renderRangeParam('range=7d');

    searchParams.value = new URLSearchParams('range=1h');
    rerender();

    expect(result.current.range).toBe('1h');
  });
});
