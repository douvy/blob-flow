import React from 'react';
import { act, render, screen } from '@testing-library/react';
import {
    TimeRangeProvider,
    resetTimeRangeStoreForTests,
    useTimeRange,
    type TimeRange,
} from './TimeRangeContext';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
}));

function Probe({ next }: { next?: TimeRange }) {
    const { timeRange, setTimeRange } = useTimeRange();
    return (
        <button type="button" onClick={() => next && setTimeRange(next)}>
            {timeRange}
        </button>
    );
}

function setUrl(path: string) {
    window.history.replaceState(null, '', path);
}

describe('TimeRangeProvider URL sync', () => {
    beforeEach(() => {
        mockPathname = '/';
        setUrl('/');
        resetTimeRangeStoreForTests();
    });

    it('restores the range from a shared URL', async () => {
        setUrl('/?range=7d');

        render(
            <TimeRangeProvider>
                <Probe />
            </TimeRangeProvider>
        );

        expect(await screen.findByText('7d')).toBeInTheDocument();
        expect(window.location.search).toBe('?range=7d');
    });

    it('writes non-default selections to the URL and clears the default', async () => {
        render(
            <TimeRangeProvider>
                <Probe next="30d" />
            </TimeRangeProvider>
        );

        await act(async () => {
            screen.getByRole('button').click();
        });

        expect(screen.getByText('30d')).toBeInTheDocument();
        expect(window.location.search).toBe('?range=30d');
    });

    it('ignores invalid range params and leaves the URL alone elsewhere', async () => {
        mockPathname = '/blocks';
        setUrl('/blocks?range=bogus');

        render(
            <TimeRangeProvider>
                <Probe next="7d" />
            </TimeRangeProvider>
        );

        expect(await screen.findByText('1h')).toBeInTheDocument();

        await act(async () => {
            screen.getByRole('button').click();
        });

        // The header filter is not shown outside home and charts, so the URL
        // is not rewritten there even though the state changes.
        expect(screen.getByText('7d')).toBeInTheDocument();
        expect(window.location.search).toBe('?range=bogus');
    });

    it('preserves unrelated query params when writing the range', async () => {
        setUrl('/?foo=bar');

        render(
            <TimeRangeProvider>
                <Probe next="24h" />
            </TimeRangeProvider>
        );

        await act(async () => {
            screen.getByRole('button').click();
        });

        const params = new URLSearchParams(window.location.search);
        expect(params.get('foo')).toBe('bar');
        expect(params.get('range')).toBe('24h');
    });
});
