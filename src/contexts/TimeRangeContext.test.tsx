import React from 'react';
import { act, render, screen } from '@testing-library/react';
import type { TimeRange } from '@/constants';
import {
    TimeRangeProvider,
    resetTimeRangeStoreForTests,
    useTimeRange,
} from './TimeRangeContext';

let mockPathname = '/';
let mockParams: Record<string, string> = {};

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
    useParams: () => mockParams,
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
        mockParams = {};
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

    it('ignores an invalid range param', async () => {
        setUrl('/?range=bogus');

        render(
            <TimeRangeProvider>
                <Probe />
            </TimeRangeProvider>
        );

        expect(await screen.findByText('1h')).toBeInTheDocument();
    });

    it('writes the range on network-scoped home and chart routes', async () => {
        mockPathname = '/sepolia/charts/base-fee';
        mockParams = { network: 'sepolia', chart: 'base-fee' };
        setUrl('/sepolia/charts/base-fee');

        render(
            <TimeRangeProvider>
                <Probe next="7d" />
            </TimeRangeProvider>
        );

        await act(async () => {
            screen.getByRole('button').click();
        });

        expect(window.location.search).toBe('?range=7d');
    });

    it('leaves routes without a time filter alone', async () => {
        mockPathname = '/sepolia/blocks';
        mockParams = { network: 'sepolia' };
        setUrl('/sepolia/blocks');

        render(
            <TimeRangeProvider>
                <Probe next="7d" />
            </TimeRangeProvider>
        );

        await act(async () => {
            screen.getByRole('button').click();
        });

        // The state still changes; only the URL is left untouched.
        expect(screen.getByText('7d')).toBeInTheDocument();
        expect(window.location.search).toBe('');
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
