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
    <div className="bg-[#141519] rounded-lg p-4 shadow-md transition-all hover:shadow-lg border border-divider">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-secondaryText font-medium text-xs uppercase tracking-wider">{title}</h3>
        {trend === 'up' && (
          <span className="text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        {trend === 'down' && (
          <span className="text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        {description && <p className="text-xs mt-1 text-secondaryText">{description}</p>}
      </div>
    </div>
  );
}