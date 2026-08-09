import type { NextRequest } from 'next/server';
import { ogNetworkParam, ogScopeFromRequest } from './params';

function request(url: string): NextRequest {
    return { nextUrl: new URL(url, 'https://blobflow.com') } as unknown as NextRequest;
}

describe('og/params', () => {
    it('reads a valid network and range', () => {
        expect(ogScopeFromRequest(request('/opengraph-image?network=sepolia&range=7d'))).toEqual({
            network: 'sepolia',
            range: '7d',
        });
    });

    it('defaults both when absent', () => {
        expect(ogScopeFromRequest(request('/opengraph-image'))).toEqual({
            network: 'mainnet',
            range: '1h',
        });
    });

    // The value is echoed into an outbound API request path, so a malformed
    // one must never be forwarded.
    it('rejects malformed networks rather than forwarding them', () => {
        expect(ogNetworkParam(request('/opengraph-image?network=../../etc/passwd'))).toBe(
            'mainnet'
        );
        expect(ogNetworkParam(request('/opengraph-image?network='))).toBe('mainnet');
        expect(ogNetworkParam(request(`/opengraph-image?network=${'a'.repeat(40)}`))).toBe(
            'mainnet'
        );
    });

    it('lowercases the network so one card is not rendered under two spellings', () => {
        expect(ogNetworkParam(request('/opengraph-image?network=Sepolia'))).toBe('sepolia');
    });

    it('falls back to the default range for an unknown one', () => {
        expect(ogScopeFromRequest(request('/opengraph-image?range=all')).range).toBe('1h');
    });
});
