"use client";

import React from 'react';
import Link from 'next/link';
import { useNetwork } from '@/hooks/useNetwork';
import { networkPath } from '@/utils';

type NetworkLinkProps = React.ComponentProps<typeof Link>;

/**
 * next/link for in-app destinations, keeping them on the network the current
 * page is showing. Drop-in replacement: use it wherever a link points inside
 * the app so navigation never silently changes network.
 */
export default function NetworkLink({ href, ...props }: NetworkLinkProps) {
  const { selectedNetwork } = useNetwork();
  const scopedHref =
    typeof href === 'string' ? networkPath(href, selectedNetwork.apiParam) : href;

  return <Link href={scopedHref} {...props} />;
}
