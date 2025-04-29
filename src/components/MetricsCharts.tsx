"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Sample data - would come from API in production
const baseFeeData = [
  { time: '00:00', baseFee: 10.2 },
  { time: '02:00', baseFee: 11.5 },
  { time: '04:00', baseFee: 12.8 },
  { time: '06:00', baseFee: 14.2 },
  { time: '08:00', baseFee: 13.7 },
  { time: '10:00', baseFee: 12.4 },
  { time: '12:00', baseFee: 11.9 },
  { time: '14:00', baseFee: 11.6 },
  { time: '16:00', baseFee: 12.5 },
  { time: '18:00', baseFee: 13.8 },
  { time: '20:00', baseFee: 15.2 },
  { time: '22:00', baseFee: 12.1 },
];

const costComparisonData = [
  { time: '00:00', blobCost: 0.0012, calldataCost: 0.0042 },
  { time: '02:00', blobCost: 0.0013, calldataCost: 0.0045 },
  { time: '04:00', blobCost: 0.0015, calldataCost: 0.0048 },
  { time: '06:00', blobCost: 0.0018, calldataCost: 0.0052 },
  { time: '08:00', blobCost: 0.0017, calldataCost: 0.0049 },
  { time: '10:00', blobCost: 0.0016, calldataCost: 0.0047 },
  { time: '12:00', blobCost: 0.0014, calldataCost: 0.0044 },
  { time: '14:00', blobCost: 0.0013, calldataCost: 0.0043 },
  { time: '16:00', blobCost: 0.0015, calldataCost: 0.0046 },
  { time: '18:00', blobCost: 0.0017, calldataCost: 0.0051 },
  { time: '20:00', blobCost: 0.0019, calldataCost: 0.0056 },
  { time: '22:00', blobCost: 0.0014, calldataCost: 0.0045 },
];

export default function MetricsCharts() {
  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-3">Data Trends</h2>
      <div className="flex flex-col space-y-6">
        <div className="rounded-lg">
          <h3 className="text-md font-medium mb-4 text-white">Base Fee over Time (gwei)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={baseFeeData}
                margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
                <XAxis 
                  dataKey="time" 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687' }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -10, fill: '#6e7687' }}
                />
                <YAxis 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687' }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'gwei', angle: -90, position: 'insideLeft', fill: '#6e7687' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                  labelStyle={{ color: '#ddd' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="baseFee" 
                  stroke="#3498db" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                  name="Base Fee (gwei)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="rounded-lg">
          <h3 className="text-md font-medium mb-4 text-white">Cost Comparison: Blob vs Calldata (ETH)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={costComparisonData}
                margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
                <XAxis 
                  dataKey="time" 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687' }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -10, fill: '#6e7687' }}
                />
                <YAxis 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687' }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'ETH', angle: -90, position: 'insideLeft', fill: '#6e7687' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                  labelStyle={{ color: '#ddd' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="blobCost" 
                  stroke="#2ecc71" 
                  strokeWidth={2}
                  name="Blob Cost (ETH)"
                />
                <Line 
                  type="monotone" 
                  dataKey="calldataCost" 
                  stroke="#e74c3c" 
                  strokeWidth={2}
                  name="Calldata Cost (ETH)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}