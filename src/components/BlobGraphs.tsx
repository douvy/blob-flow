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

export default function BlobGraphs() {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-windsor-bold text-titleText mb-4">Data Trends</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-container p-4 rounded-lg shadow-md">
          <h3 className="text-md font-medium mb-4 text-titleText">Blob Base Fee over Time (gwei)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={baseFeeData}
                margin={{ top: 5, right: 30, left: 30, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="time" 
                  stroke="#888" 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -5, fill: '#888', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#888" 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'gwei', angle: -90, position: 'insideLeft', offset: -15, fill: '#888', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                  labelStyle={{ color: '#ddd' }}
                />
                <Legend wrapperStyle={{ paddingTop: '40px', marginBottom: '20px' }} verticalAlign="bottom" />
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
        
        <div className="bg-container p-4 rounded-lg shadow-md">
          <h3 className="text-md font-medium mb-4 text-titleText">Blob Cost vs Calldata Cost (ETH)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={costComparisonData}
                margin={{ top: 5, right: 30, left: 30, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="time" 
                  stroke="#888" 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -5, fill: '#888', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#888" 
                  tick={{ fontSize: 12 }}
                  label={{ value: 'ETH', angle: -90, position: 'insideLeft', offset: -15, fill: '#888', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                  labelStyle={{ color: '#ddd' }}
                />
                <Legend wrapperStyle={{ paddingTop: '40px', marginBottom: '20px' }} verticalAlign="bottom" />
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