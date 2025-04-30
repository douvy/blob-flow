"use client";

import React from 'react';
import MetricCard from './MetricCard';

export default function LiveMetrics() {
  // Placeholder data - in a real app, this would come from an API
  const metrics = [
    {
      title: 'Current Blob Base Fee',
      value: '12.45 gwei',
      trend: 'up' as const,
      description: 'Hourly change: +0.8%',
      icon: 'fa-solid fa-money-bills'
    },
    {
      title: 'Pending Blobs in Mempool',
      value: '237',
      trend: 'up' as const,
      description: 'Current mempool status',
      icon: 'fa-solid fa-timer'
    },
    {
      title: 'Avg. Blobs per Block (24h)',
      value: '16.4',
      trend: 'neutral' as const,
      description: '24h network average',
      icon: 'fa-solid fa-cube'
    },
    {
      title: 'Blob Cost vs Calldata Cost',
      value: '72% cheaper',
      trend: 'down' as const,
      description: 'Savings vs calldata',
      icon: 'fa-solid fa-scale-unbalanced-flip'
    }
  ];

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-4">Live Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard 
            key={index}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            description={metric.description}
            icon={metric.icon}
          />
        ))}
      </div>
    </section>
  );
}