"use client";

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BlobWebSocketConnectionState,
  BlobWebSocketEventMap,
  LatestBlobWebSocketEvents,
  LiveBlobWebSocketEvent,
  SubscribableBlobEventType,
} from '@/types';
import {
  BlobWebSocketClient,
  DEFAULT_BLOB_WEBSOCKET_SUBSCRIPTIONS,
  buildBlobWebSocketUrl,
} from '@/lib/blobWebSocket';

type LiveBlobEventHandler = (event: LiveBlobWebSocketEvent) => void;

interface LiveDataContextValue {
  connectionState: BlobWebSocketConnectionState;
  lastEvent: LiveBlobWebSocketEvent | null;
  latestEvents: LatestBlobWebSocketEvents;
  subscribe: (handler: LiveBlobEventHandler) => () => void;
}

interface LiveDataProviderProps {
  children: ReactNode;
  network: string;
  subscriptions?: SubscribableBlobEventType[];
}

const defaultContextValue: LiveDataContextValue = {
  connectionState: 'disconnected',
  lastEvent: null,
  latestEvents: {},
  subscribe: () => () => {},
};

const LiveDataContext = createContext<LiveDataContextValue>(defaultContextValue);

export function LiveDataProvider({
  children,
  network,
  subscriptions = DEFAULT_BLOB_WEBSOCKET_SUBSCRIPTIONS,
}: LiveDataProviderProps) {
  const handlersRef = useRef(new Set<LiveBlobEventHandler>());
  const [connectionState, setConnectionState] =
    useState<BlobWebSocketConnectionState>('connecting');
  const [lastEvent, setLastEvent] = useState<LiveBlobWebSocketEvent | null>(null);
  const [latestEvents, setLatestEvents] = useState<LatestBlobWebSocketEvents>({});
  const subscriptionKey = subscriptions.join(',');

  const subscribe = useCallback((handler: LiveBlobEventHandler) => {
    handlersRef.current.add(handler);

    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    const client = new BlobWebSocketClient({
      url: buildBlobWebSocketUrl(network),
      subscriptions,
      onConnectionStateChange: setConnectionState,
      onEvent: (event) => {
        setLastEvent(event);
        setLatestEvents((currentEvents) => ({
          ...currentEvents,
          [event.type]: event,
        }));
        handlersRef.current.forEach((handler) => {
          handler(event);
        });
      },
      onError: () => {
        setConnectionState((currentState) =>
          currentState === 'connected' ? 'stale' : currentState
        );
      },
    });

    client.connect();

    return () => {
      client.disconnect();
    };
  }, [network, subscriptionKey, subscriptions]);

  const value = useMemo<LiveDataContextValue>(
    () => ({
      connectionState,
      lastEvent,
      latestEvents,
      subscribe,
    }),
    [connectionState, lastEvent, latestEvents, subscribe]
  );

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useBlobWebSocket() {
  return useContext(LiveDataContext);
}

export function useLiveBlobEvent<EventType extends SubscribableBlobEventType>(
  eventType: EventType,
  handler: (event: BlobWebSocketEventMap[EventType]) => void
) {
  const { subscribe } = useBlobWebSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === eventType) {
        handlerRef.current(event as BlobWebSocketEventMap[EventType]);
      }
    });
  }, [eventType, subscribe]);
}
