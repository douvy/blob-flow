import React from 'react';
import MetricCard from './MetricCard';

export default function LiveMetrics() {
  // Placeholder data - in a real app, this would come from an API
  const metrics = [
    {
      title: 'Current Blob Base Fee',
      value: '12.45 gwei',
      trend: 'up' as const,
      description: 'Fee increased 0.8% in the last hour'
    },
    {
      title: 'Pending Blobs in Mempool',
      value: '237',
      trend: 'up' as const,
      description: 'Current mempool status'
    },
    {
      title: 'Average Blobs per Block (24h)',
      value: '16.4',
      trend: 'neutral' as const,
      description: 'Stable over the past 24 hours'
    },
    {
      title: 'Blob Cost vs Calldata Cost',
      value: '72% cheaper',
      trend: 'down' as const,
      description: 'Cost compared to equivalent L1 calldata'
    }
  ];

  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-titleText mb-4">Live Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard 
            key={index}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            description={metric.description}
          />
        ))}
      </div>
    </section>
  );
}