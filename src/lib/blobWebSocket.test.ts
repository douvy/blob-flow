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
    expect(parseBlobWebSocketEvent(JSON.stringify({ type: 'ping' }))).toEqual({ type: 'ping' });

    const parsed = parseBlobWebSocketEvent(
      JSON.stringify({
        type: 'new_block',
        data: {
          block_number: 123,
          blob_count: 1,
          timestamp: '2026-03-09T14:00:00Z',
          blobs: [blobResponse],
        },
      })
    );

    expect(parsed?.type).toBe('new_block');
    if (parsed?.type === 'new_block') {
      expect(parsed.data.blob_count).toBe(1);
      expect(parsed.data.blobs[0].tx_hash).toBe('0xabc123');
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

  it('does not surface ping events to consumers', () => {
    const events: LiveBlobWebSocketEvent[] = [];
    const client = new BlobWebSocketClient({
      url: 'wss://example.test/api/v1/ws?network=mainnet',
      WebSocketImpl: MockWebSocket,
      onEvent: (event) => events.push(event),
    });

    client.connect();
    MockWebSocket.instances[0].open();
    MockWebSocket.instances[0].receive(JSON.stringify({ type: 'ping' }));
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

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('stats_update');
  });

  it('marks open sockets stale when heartbeats stop and restores connected on messages', async () => {
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
    await vi.advanceTimersByTimeAsync(50);

    expect(states).toEqual(['connecting', 'connected', 'stale']);

    MockWebSocket.instances[0].receive(JSON.stringify({ type: 'ping' }));

    expect(states).toEqual(['connecting', 'connected', 'stale', 'connected']);
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
