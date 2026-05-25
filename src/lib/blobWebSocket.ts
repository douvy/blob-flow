import { API_BASE_URL } from '@/constants';
import {
  BlobWebSocketConnectionState,
  BlobWebSocketEvent,
  BlobWebSocketSubscribeMessage,
  LiveBlobWebSocketEvent,
  MempoolUpdateData,
  NewBlockData,
  SubscribableBlobEventType,
  UserResponse,
  WebSocketStatsResponse,
} from '@/types';

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const DEFAULT_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30000;
const DEFAULT_STALE_TIMEOUT_MS = 45000;

export const DEFAULT_BLOB_WEBSOCKET_SUBSCRIPTIONS: SubscribableBlobEventType[] = [
  'new_block',
  'mempool_update',
  'stats_update',
  'users_update',
];

type WebSocketMessageHandler = (event: MessageEvent<string>) => void;
type WebSocketCloseHandler = (event: CloseEvent) => void;
type WebSocketEventHandler = (event: Event) => void;

export interface WebSocketLike {
  readyState: number;
  onopen: WebSocketEventHandler | null;
  onmessage: WebSocketMessageHandler | null;
  onclose: WebSocketCloseHandler | null;
  onerror: WebSocketEventHandler | null;
  send: (data: string) => void;
  close: () => void;
}

export interface WebSocketConstructorLike {
  new (url: string): WebSocketLike;
}

interface BlobWebSocketClientOptions {
  url: string;
  subscriptions?: SubscribableBlobEventType[];
  WebSocketImpl?: WebSocketConstructorLike;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  staleTimeoutMs?: number;
  onConnectionStateChange?: (state: BlobWebSocketConnectionState) => void;
  onActivity?: () => void;
  onEvent?: (event: LiveBlobWebSocketEvent) => void;
  onError?: (event: Event) => void;
}

export function buildBlobWebSocketUrl(
  network: string,
  apiBaseUrl = API_BASE_URL,
  websocketUrlOverride = process.env.NEXT_PUBLIC_WS_URL
): string {
  const baseUrl = websocketUrlOverride || apiBaseUrl;
  const url = new URL(baseUrl);

  if (url.protocol === 'http:') {
    url.protocol = 'ws:';
  } else if (url.protocol === 'https:') {
    url.protocol = 'wss:';
  }

  if (!websocketUrlOverride) {
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
  }

  url.searchParams.set('network', network);
  return url.toString();
}

export function createBlobWebSocketSubscribeMessage(
  subscriptions: SubscribableBlobEventType[] = DEFAULT_BLOB_WEBSOCKET_SUBSCRIPTIONS
): BlobWebSocketSubscribeMessage {
  return {
    subscribe: Array.from(new Set(subscriptions)),
  };
}

export function parseBlobWebSocketEvent(message: string): BlobWebSocketEvent | null {
  let payload: unknown;
  const trimmedMessage = message.trim();

  if (trimmedMessage === 'ping' || trimmedMessage === 'pong') {
    return { type: trimmedMessage };
  }

  try {
    payload = JSON.parse(trimmedMessage);
  } catch {
    return null;
  }

  if (!isRecord(payload) || typeof payload.type !== 'string') {
    return null;
  }

  switch (payload.type) {
    case 'ping':
      return { type: 'ping' };
    case 'pong':
      return { type: 'pong' };
    case 'new_block':
      if (isRecord(payload.data)) {
        return { type: 'new_block', data: payload.data as unknown as NewBlockData };
      }
      return null;
    case 'mempool_update':
      if (isMempoolUpdateData(payload.data)) {
        return { type: 'mempool_update', data: payload.data };
      }
      return null;
    case 'stats_update':
      if (isRecord(payload.data)) {
        return { type: 'stats_update', data: payload.data as unknown as WebSocketStatsResponse };
      }
      return null;
    case 'users_update':
      if (Array.isArray(payload.data)) {
        return { type: 'users_update', data: payload.data.filter(isRecord) as unknown as UserResponse[] };
      }
      return null;
    default:
      return null;
  }
}

export class BlobWebSocketClient {
  private socket: WebSocketLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private closedByClient = false;
  private connectionState: BlobWebSocketConnectionState = 'disconnected';

  constructor(private readonly options: BlobWebSocketClientOptions) {}

  connect() {
    if (this.hasActiveSocket()) {
      return;
    }

    const WebSocketImpl: WebSocketConstructorLike | undefined =
      this.options.WebSocketImpl ?? globalThis.WebSocket;
    if (!WebSocketImpl) {
      this.setConnectionState('disconnected');
      return;
    }

    this.closedByClient = false;
    this.clearReconnectTimer();
    this.setConnectionState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    const socket = new WebSocketImpl(this.options.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) {
        return;
      }

      this.reconnectAttempt = 0;
      this.setConnectionState('connected');
      this.resetStaleTimer();
      this.sendSubscriptions();
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) {
        return;
      }

      this.resetStaleTimer();
      const parsedEvent = parseBlobWebSocketEvent(event.data);
      if (!parsedEvent) {
        return;
      }

      this.options.onActivity?.();
      if (parsedEvent.type === 'ping' || parsedEvent.type === 'pong') {
        return;
      }

      this.options.onEvent?.(parsedEvent);
    };

    socket.onerror = (event) => {
      if (this.socket !== socket) {
        return;
      }

      this.options.onError?.(event);
    };

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      this.clearStaleTimer();

      if (this.closedByClient) {
        this.setConnectionState('disconnected');
        return;
      }

      this.scheduleReconnect();
    };
  }

  disconnect() {
    this.closedByClient = true;
    this.clearReconnectTimer();
    this.clearStaleTimer();

    const socket = this.socket;
    this.socket = null;

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;

      if (socket.readyState === SOCKET_CONNECTING || socket.readyState === SOCKET_OPEN) {
        socket.close();
      }
    }

    this.setConnectionState('disconnected');
  }

  get state() {
    return this.connectionState;
  }

  private hasActiveSocket() {
    return (
      this.socket !== null &&
      (this.socket.readyState === SOCKET_CONNECTING || this.socket.readyState === SOCKET_OPEN)
    );
  }

  private sendSubscriptions() {
    if (!this.socket || this.socket.readyState !== SOCKET_OPEN) {
      return;
    }

    const subscriptions = this.options.subscriptions ?? DEFAULT_BLOB_WEBSOCKET_SUBSCRIPTIONS;
    if (subscriptions.length === 0) {
      return;
    }

    this.socket.send(JSON.stringify(createBlobWebSocketSubscribeMessage(subscriptions)));
  }

  private scheduleReconnect() {
    this.setConnectionState('reconnecting');

    const baseDelay = this.options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
    const maxDelay = this.options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;
    const delay = Math.min(baseDelay * 2 ** this.reconnectAttempt, maxDelay);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private resetStaleTimer() {
    this.clearStaleTimer();

    const staleTimeoutMs = this.options.staleTimeoutMs ?? DEFAULT_STALE_TIMEOUT_MS;
    this.staleTimer = setTimeout(() => {
      if (this.socket?.readyState === SOCKET_OPEN) {
        this.setConnectionState('stale');
      }
    }, staleTimeoutMs);

    if (this.connectionState === 'stale') {
      this.setConnectionState('connected');
    }
  }

  private setConnectionState(state: BlobWebSocketConnectionState) {
    if (this.connectionState === state) {
      return;
    }

    this.connectionState = state;
    this.options.onConnectionStateChange?.(state);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearStaleTimer() {
    if (this.staleTimer) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMempoolUpdateData(value: unknown): value is MempoolUpdateData {
  if (!isRecord(value)) {
    return false;
  }

  if (value.action !== 'add' && value.action !== 'remove') {
    return false;
  }

  return isRecord(value.blob) && typeof value.blob.tx_hash === 'string';
}
