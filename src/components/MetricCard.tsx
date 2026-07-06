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
  const cardClassName = "block rounded-lg border border-divider bg-[#14161a] p-4 h-full";
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

  return href ? (
    <Link
      href={href}
      aria-label={ariaLabel || `View ${title}`}
      className={`${cardClassName} transition-colors hover:bg-[#1a1d23] hover:border-[#3a4154] focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2 focus:ring-offset-[#0b0c10]`}
    >
      {cardContent}
    </Link>
  ) : (
    <div className={cardClassName}>{cardContent}</div>
  );
}
