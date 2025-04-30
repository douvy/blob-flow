"use client";

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: string;
}

export default function MetricCard({ title, value, trend = 'neutral', description, icon }: MetricCardProps) {
  return (
    <div className="relative h-full">
      {/* Blue outer glow/border */}
      <div className="absolute -inset-[2px] rounded-lg bg-blue/40"></div>
      
      <div className="relative rounded-lg p-4 shadow-md transition-all hover:shadow-lg border border-divider h-full" 
           style={{ 
             background: `url('/images/subtle-pattern.png') repeat, #141519` 
           }}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-[#b8bdc7] font-medium text-xs uppercase tracking-wider flex items-center mb-1">
            {icon && <i className={`${icon} text-blue mr-2`} aria-hidden="true"></i>}
            {title}
          </h3>
          {trend === 'up' && (
            <i className="fa-regular fa-arrow-up-right text-[#b8bdc7]" aria-hidden="true"></i>
          )}
          {trend === 'down' && (
            <i className="fa-regular fa-arrow-down-right text-[#b8bdc7]" aria-hidden="true"></i>
          )}
        </div>
        <div>
          <p className="text-2xl font-windsor-bold text-white">{value}</p>
          {description && <p className="text-xs mt-1 text-[#b8bdc7]">{description}</p>}
        </div>
      </div>
    </div>
  );
}