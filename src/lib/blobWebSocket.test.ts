import {
  BlobWebSocketClient,
  WebSocketLike,
  buildBlobWebSocketUrl,
  createBlobWebSocketSubscribeMessage,
  parseBlobWebSocketEvent,
} from './blobWebSocket';
import { BlobResponse, LiveBlobWebSocketEvent } from '@/types';

class MockWebSocket implements WebSocketLike {
  static instances: MockWebSocket[] = [];

  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly sentMessages: string[] = [];

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
  }

  open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  receive(data: string) {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  closeFromServer() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }
}

const blobResponse: BlobResponse = {
  network_id: 1,
  network_name: 'mainnet',
  block_number: 123,
  blob_index: 0,
  tx_hash: '0xabc123',
  from_address: '0x0000000000000000000000000000000000000000',
  blob_size_bytes: 131072,
  base_fee_per_blob_gas: '1000000000',
  tip_per_blob_gas: '100000000',
  total_cost_eth: '0.001',
  timestamp: '2026-03-09T14:00:00Z',
  confirmed: true,
};

describe('blobWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives websocket URLs from API URLs and preserves explicit overrides', () => {
    expect(
      buildBlobWebSocketUrl('mainnet', 'https://blob-indexer.ahkc.win/api/v1', undefined)
    ).toBe('wss://blob-indexer.ahkc.win/api/v1/ws?network=mainnet');

    expect(buildBlobWebSocketUrl('sepolia', 'http://localhost:8080/api/v1', undefined)).toBe(
      'ws://localhost:8080/api/v1/ws?network=sepolia'
    );

    expect(
      buildBlobWebSocketUrl(
        'mainnet',
        'https://ignored.example/api/v1',
        'wss://stream.example/ws?token=abc'
      )
    ).toBe('wss://stream.example/ws?token=abc&network=mainnet');
  });

  it('builds subscription filter messages without duplicates', () => {
    expect(createBlobWebSocketSubscribeMessage(['new_block', 'new_block', 'stats_update'])).toEqual({
      subscribe: ['new_block', 'stats_update'],
    });
  });

  it('parses known events and ignores invalid messages', () => {
    expect(parseBlobWebSocketEvent('not json')).toBeNull();
    expect(parseBlobWebSocketEvent(JSON.stringify({ type: 'unknown' }))).toBeNull();
    expect(parseBlobWebSocketEvent('ping')).toEqual({ type: 'ping' });
    expect(parseBlobWebSocketEvent('pong')).toEqual({ type: 'pong' });
    expect(parseBlobWebSocketEvent(JSON.stringify({ type: 'ping' }))).toEqual({ type: 'ping' });
    expect(parseBlobWebSocketEvent(JSON.stringify({ type: 'pong' }))).toEqual({ type: 'pong' });

    const parsed = parseBlobWebSocketEvent(
      JSON.stringify({
        type: 'new_block',
        data: {
          block_number: 123,
          blob_count: 1,
          timestamp: '2026-03-09T14:00:00Z',
          blobs: [blobResponse],
          pricing: {
            block_number: 123,
            block_timestamp: '2026-03-09T14:00:00Z',
            blob_count: 1,
            blob_gas_used: 131072,
            blob_gas_target: 393216,
            blob_gas_limit: 786432,
            excess_blob_gas: 0,
            blob_base_fee: '1000000000',
            blob_base_fee_gwei: '1',
            utilization_ratio: '0.1667',
            blob_params_target: 3,
            blob_params_max: 6,
            target_blobs: 3,
            max_blobs: 6,
            available_blobs: 5,
            utilization_percent: 16.67,
            is_full: false,
            is_above_target: false,
            update_fraction: 3338477,
          },
        },
      })
    );

    expect(parsed?.type).toBe('new_block');
    if (parsed?.type === 'new_block') {
      expect(parsed.data.blob_count).toBe(1);
      expect(parsed.data.blobs[0].tx_hash).toBe('0xabc123');
      expect(parsed.data.pricing?.max_blobs).toBe(6);
    }
  });

  it('parses users_update events and carries the range tag through', () => {
    const user = {
      address: '0x0000000000000000000000000000000000000001',
      name: 'Base',
      blob_count: 4,
      total_cost_eth: '0.004',
      last_timestamp: '2026-03-09T14:00:00Z',
    };

    const tagged = parseBlobWebSocketEvent(
      JSON.stringify({ type: 'users_update', range: '24h', data: [user] })
    );
    expect(tagged?.type).toBe('users_update');
    if (tagged?.type === 'users_update') {
      expect(tagged.range).toBe('24h');
      expect(tagged.data).toEqual([user]);
    }

    const untagged = parseBlobWebSocketEvent(
      JSON.stringify({ type: 'users_update', data: [user] })
    );
    expect(untagged?.type).toBe('users_update');
    if (untagged?.type === 'users_update') {
      expect(untagged.range).toBeUndefined();
    }
  });

  it('opens one active socket and sends subscription filters after connect', () => {
    const states: string[] = [];
    const client = new BlobWebSocketClient({
      url: 'wss://example.test/api/v1/ws?network=mainnet',
      subscriptions: ['new_block', 'stats_update'],
      WebSocketImpl: MockWebSocket,
      onConnectionStateChange: (state) => states.push(state),
    });

    client.connect();
    client.connect();

    expect(MockWebSocket.instances).toHaveLength(1);

    MockWebSocket.instances[0].open();

    expect(states).toEqual(['connecting', 'connected']);
    expect(MockWebSocket.instances[0].sentMessages).toEqual([
      JSON.stringify({ subscribe: ['new_block', 'stats_update'] }),
    ]);
  });

  it('tracks activity but does not surface heartbeat events to consumers', () => {
    let activityCount = 0;
    const events: LiveBlobWebSocketEvent[] = [];
    const client = new BlobWebSocketClient({
      url: 'wss://example.test/api/v1/ws?network=mainnet',
      WebSocketImpl: MockWebSocket,
      onActivity: () => {
        activityCount += 1;
      },
      onEvent: (event) => events.push(event),
    });

    client.connect();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].receive(JSON.stringify({ type: 'ping' }));
    MockWebSocket.instances[0].receive(JSON.stringify({ type: 'pong' }));
    MockWebSocket.instances[0].receive(
      JSON.stringify({
        type: 'stats_update',
        data: {
          total_blobs: 10,
          total_confirmed_blobs: 8,
          total_pending_blobs: 2,
          average_base_fee: '1000000000',
          average_tip: '100000000',
          average_total_cost: '0.001',
          last_indexed_block: 123,
          last_indexed_time: '2026-03-09T14:00:00Z',
        },
      })
    );

    expect(activityCount).toBe(3);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('stats_update');
  });

  it('force-reconnects a silent open socket instead of waiting for TCP to notice', async () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const client = new BlobWebSocketClient({
      url: 'wss://example.test/api/v1/ws?network=mainnet',
      WebSocketImpl: MockWebSocket,
      staleTimeoutMs: 50,
      reconnectDelayMs: 10,
      onConnectionStateChange: (state) => states.push(state),
    });

    client.connect();
    MockWebSocket.instances[0].open();
    await vi.advanceTimersByTimeAsync(50);

    // The half-dead socket is abandoned and closed immediately...
    expect(states).toEqual(['connecting', 'connected', 'stale', 'reconnecting']);
    expect(MockWebSocket.instances[0].readyState).toBe(3);

    // ...and a replacement comes up after the backoff delay.
    await vi.advanceTimersByTimeAsync(10);
    expect(MockWebSocket.instances).toHaveLength(2);
    MockWebSocket.instances[1].open();
    expect(states).toEqual(['connecting', 'connected', 'stale', 'reconnecting', 'connected']);
  });

  it('keeps a live socket connected while messages keep arriving', async () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const client = new BlobWebSocketClient({
      url: 'wss://example.test/api/v1/ws?network=mainnet',
      WebSocketImpl: MockWebSocket,
      staleTimeoutMs: 50,
      onConnectionStateChange: (state) => states.push(state),
    });

    client.connect();
    MockWebSocket.instances[0].open();
    for (let i = 0; i < 3; i += 1) {
      await vi.advanceTimersByTimeAsync(30); // under the stale timeout
      MockWebSocket.instances[0].receive(JSON.stringify({ type: 'ping' }));
    }

    expect(states).toEqual(['connecting', 'connected']);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('parses block_snapshot events and rejects malformed ones', () => {
    const parsed = parseBlobWebSocketEvent(
      JSON.stringify({
        type: 'block_snapshot',
        data: {
          blocks: [
            {
              block_number: 124,
              blob_count: 0,
              timestamp: '2026-03-09T14:00:12Z',
              blobs: [],
            },
            {
              block_number: 123,
              blob_count: 1,
              timestamp: '2026-03-09T14:00:00Z',
              blobs: [blobResponse],
            },
          ],
        },
      })
    );

    expect(parsed?.type).toBe('block_snapshot');
    if (parsed?.type === 'block_snapshot') {
      expect(parsed.data.blocks).toHaveLength(2);
      expect(parsed.data.blocks[0].block_number).toBe(124);
    }

    expect(parseBlobWebSocketEvent(JSON.stringify({ type: 'block_snapshot' }))).toBeNull();
    expect(parseBlobWebSocketEvent(JSON.stringify({ type: 'block_snapshot', data: {} }))).toBeNull();
  });

  it('reconnects with capped backoff after unplanned closes', async () => {
    vi.useFakeTimers();
    const states: string[] = [];
    const client = new BlobWebSocketClient({
      url: 'wss://example.test/api/v1/ws?network=mainnet',
      WebSocketImpl: MockWebSocket,
      reconnectDelayMs: 10,
      maxReconnectDelayMs: 15,
      onConnectionStateChange: (state) => states.push(state),
    });

    client.connect();
    MockWebSocket.instances[0].closeFromServer();
    await vi.advanceTimersByTimeAsync(10);

    expect(MockWebSocket.instances).toHaveLength(2);

    MockWebSocket.instances[1].closeFromServer();
    await vi.advanceTimersByTimeAsync(14);
    expect(MockWebSocket.instances).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(MockWebSocket.instances).toHaveLength(3);
    expect(states).toEqual(['connecting', 'reconnecting']);
  });
});
