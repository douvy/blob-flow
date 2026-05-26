"use client";

import React from 'react';
import { useNow } from '../hooks/useNow';
import { formatRelativeTime } from '../lib/api/core';

export function RelativeTime({ timestamp }: { timestamp: string }) {
  const now = useNow();
  return <>{formatRelativeTime(timestamp, new Date(now))}</>;
}
