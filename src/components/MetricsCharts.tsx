"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
        <div className="rounded-tl-lg mb-2 border border-divider rounded-tr-lg rounded-bl-lg bg-blue/10 p-3 relative after:content-[''] after:absolute after:border-b-[10px] after:border-r-[10px] after:border-[#171c28] after:right-0 after:bottom-0 after:w-full after:h-full after:pointer-events-none after:rounded-br-lg after:rounded-bl-lg after:rounded-tr-lg after:-right-0 after:-bottom-0 after:left-[11px] after:top-[11px]">
          <h3 className="text-md font-medium mb-4 text-white">Base Fee over Time (gwei)</h3>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={baseFeeData}
                margin={{ top: 5, right: 30, left: 30, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0} />
                <XAxis 
                  dataKey="time" 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -5, fill: '#6e7687', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'gwei', angle: -90, position: 'insideLeft', offset: -15, fill: '#6e7687', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#14161a', 
                    borderColor: '#333', 
                    fontSize: '12px',
                    borderRadius: '8px',
                    padding: '8px' 
                  }}
                  labelStyle={{ color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseFee" 
                  stroke="rgb(59, 130, 246)" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                  name="Base Fee (gwei)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[#6e7687]">
              <span className="inline-flex items-center mr-4">
                <span className="inline-block w-3 h-3 bg-blue mr-1 rounded-sm" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></span>
                Base Fee (gwei)
              </span>
            </div>
          </div>
        </div>
        
        <div className="rounded-tl-lg border border-divider rounded-tr-lg rounded-bl-lg bg-blue/10 p-3 relative after:content-[''] after:absolute after:border-b-[10px] after:border-r-[10px] after:border-[#171c28] after:right-0 after:bottom-0 after:w-full after:h-full after:pointer-events-none after:rounded-br-lg after:rounded-bl-lg after:rounded-tr-lg after:-right-0 after:-bottom-0 after:left-[11px] after:top-[11px]">
          <h3 className="text-md font-medium mb-4 text-white">Cost Comparison: Blob vs Calldata (ETH)</h3>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={costComparisonData}
                margin={{ top: 5, right: 30, left: 30, bottom: 35 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0} />
                <XAxis 
                  dataKey="time" 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -5, fill: '#6e7687', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#6e7687" 
                  tick={{ fill: '#6e7687', fontSize: 12 }}
                  axisLine={{ stroke: '#333' }}
                  tickLine={{ stroke: '#333' }}
                  label={{ value: 'ETH', angle: -90, position: 'insideLeft', offset: -15, fill: '#6e7687', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#14161a', 
                    borderColor: '#333', 
                    fontSize: '12px',
                    borderRadius: '8px',
                    padding: '8px' 
                  }}
                  labelStyle={{ color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="blobCost" 
                  stroke="rgb(59, 130, 246)" 
                  strokeWidth={2}
                  name="Blob Cost (ETH)"
                />
                <Line 
                  type="monotone" 
                  dataKey="calldataCost" 
                  stroke="#6A5ACD" 
                  strokeWidth={2}
                  name="Calldata Cost (ETH)"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[#6e7687]">
              <span className="inline-flex items-center mr-4">
                <span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></span>
                Blob Cost (ETH)
              </span>
              <span className="inline-flex items-center">
                <span className="inline-block w-3 h-3 bg-purple mr-1 rounded-sm"></span>
                Calldata Cost (ETH)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}