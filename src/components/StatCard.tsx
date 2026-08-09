"use client";

import React from 'react';

/**
 * Labelled figure used on the detail pages (block, transaction). Values may
 * be nodes so a card can hold a link or a badge alongside its number.
 */
export default function StatCard({
  label,
  value,
  title,
}: {
  label: string;
  value: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="bg-gradient-to-b from-[#22252c] to-[#16171b] border border-divider rounded-lg p-4">
      <div className="text-xs text-[#6e7787] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl text-white font-medium break-words" title={title}>
        {value}
      </div>
    </div>
  );
}
