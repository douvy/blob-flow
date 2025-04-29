"use client";

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export default function MetricCard({ title, value, trend = 'neutral', description }: MetricCardProps) {
  return (
    <div className="relative h-full">
      {/* Blue outer glow/border */}
      <div className="absolute -inset-[2px] rounded-lg bg-[#0751c5]/25"></div>
      
      <div className="relative bg-[#141519] rounded-lg p-4 shadow-md transition-all hover:shadow-lg border border-divider h-full">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-secondaryText font-medium text-xs uppercase tracking-wider">{title}</h3>
          {trend === 'up' && (
            <i className="fa-regular fa-arrow-up-right text-green-400" aria-hidden="true"></i>
          )}
          {trend === 'down' && (
            <i className="fa-regular fa-arrow-down-right text-red-400" aria-hidden="true"></i>
          )}
        </div>
        <div>
          <p className="text-2xl font-windsor-bold text-white">{value}</p>
          {description && <p className="text-xs mt-1 text-secondaryText">{description}</p>}
        </div>
      </div>
    </div>
  );
}