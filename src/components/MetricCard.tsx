"use client";

import React from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: LucideIcon;
}

export default function MetricCard({ title, value, trend = 'neutral', description, icon }: MetricCardProps) {
  const Icon = icon;

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
            {Icon && <Icon className="mr-2 h-4 w-4 text-blue" aria-hidden="true" />}
            {title}
          </h3>
          {trend === 'up' && (
            <ArrowUpRight className="h-4 w-4 text-[#b8bdc7]" aria-hidden="true" />
          )}
          {trend === 'down' && (
            <ArrowDownRight className="h-4 w-4 text-[#b8bdc7]" aria-hidden="true" />
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
