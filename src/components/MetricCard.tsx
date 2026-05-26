"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon?: LucideIcon;
  href?: string;
  ariaLabel?: string;
}

export default function MetricCard({
  title,
  value,
  trend = 'neutral',
  description,
  icon,
  href,
  ariaLabel,
}: MetricCardProps) {
  const Icon = icon;
  const cardClassName = "relative block rounded-lg p-4 shadow-md transition-all hover:shadow-lg border border-divider h-full";
  const cardStyle = {
    background: `url('/images/subtle-pattern.png') repeat, #141519`,
  };
  const cardContent = (
    <>
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
        <p className="truncate text-2xl font-windsor-bold text-white" title={value}>{value}</p>
        {description && <p className="text-xs mt-1 text-[#b8bdc7]">{description}</p>}
      </div>
    </>
  );

  return (
    <div className="relative h-full">
      {/* Blue outer glow/border */}
      <div className="absolute -inset-[2px] rounded-lg bg-blue/40"></div>

      {href ? (
        <Link
          href={href}
          aria-label={ariaLabel || `View ${title}`}
          className={`${cardClassName} focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2 focus:ring-offset-[#0b0c10]`}
          style={cardStyle}
        >
          {cardContent}
        </Link>
      ) : (
        <div className={cardClassName} style={cardStyle}>
          {cardContent}
        </div>
      )}
    </div>
  );
}
