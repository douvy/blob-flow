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
import { useQueryClient } from '@tanstack/react-query';
import {
  BlobWebSocketConnectionState,
  BlobWebSocketEventMap,
  LiveBlobEventType,
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
  subscribe: (handler: LiveBlobEventHandler) => () => void;
}

interface LiveDataProviderProps {
  children: ReactNode;
  network: string;
  subscriptions?: SubscribableBlobEventType[];
}

const defaultContextValue: LiveDataContextValue = {
  connectionState: 'disconnected',
  subscribe: () => () => {},
};

const LiveDataContext = createContext<LiveDataContextValue>(defaultContextValue);

export function LiveDataProvider({
  children,
  network,
  subscriptions = DEFAULT_BLOB_WEBSOCKET_SUBSCRIPTIONS,
}: LiveDataProviderProps) {
  const handlersRef = useRef(new Set<LiveBlobEventHandler>());
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] =
    useState<BlobWebSocketConnectionState>('connecting');
  const lastConnectionStateRef = useRef<BlobWebSocketConnectionState>('connecting');
  const subscriptionKey = normalizeSubscriptions(subscriptions).join(',');
  const normalizedSubscriptions = useMemo<SubscribableBlobEventType[]>(() => {
    if (!subscriptionKey) {
      return [];
    }

    return subscriptionKey.split(',') as SubscribableBlobEventType[];
  }, [subscriptionKey]);

  const subscribe = useCallback((handler: LiveBlobEventHandler) => {
    handlersRef.current.add(handler);

    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    const client = new BlobWebSocketClient({
      url: buildBlobWebSocketUrl(network),
      subscriptions: normalizedSubscriptions,
      onConnectionStateChange: (state) => {
        // Blocks broadcast during a reconnect window never replay as live
        // events; the server's block_snapshot covers the recent ones, and
        // invalidating the REST caches refetches everything else so no
        // component is left showing a pre-disconnect world.
        if (state === 'connected' && lastConnectionStateRef.current === 'reconnecting') {
          void queryClient.invalidateQueries();
        }
        lastConnectionStateRef.current = state;
        setConnectionState(state);
      },
      onEvent: (event) => {
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
  }, [network, normalizedSubscriptions, queryClient]);

  const value = useMemo<LiveDataContextValue>(
    () => ({
      connectionState,
      subscribe,
    }),
    [connectionState, subscribe]
  );

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useBlobWebSocket() {
  return useContext(LiveDataContext);
}

export function useLiveBlobEvent<EventType extends LiveBlobEventType>(
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

export function useLatestBlobEvent<EventType extends LiveBlobEventType>(
  eventType: EventType
): BlobWebSocketEventMap[EventType] | null {
  const [event, setEvent] = useState<BlobWebSocketEventMap[EventType] | null>(null);
  useLiveBlobEvent(eventType, setEvent);
  return event;
}

function normalizeSubscriptions(subscriptions: SubscribableBlobEventType[]) {
  return Array.from(new Set(subscriptions)).sort();
}
