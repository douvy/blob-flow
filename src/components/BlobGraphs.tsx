"use client";

import React, { useCallback } from 'react';
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
import { useApiData } from '@/hooks/useApiData';
import { getChartData, ChartData } from '@/lib/api/charts';
import { useNetwork } from '@/hooks/useNetwork';

export default function BlobGraphs() {
  const { selectedNetwork } = useNetwork();
  const fetchCharts = useCallback(() => getChartData(selectedNetwork.apiParam), [selectedNetwork]);
  const { data, isLoading, error } = useApiData<ChartData>(fetchCharts, [selectedNetwork]);

  const baseFeeData = data?.baseFeeData ?? [];
  const costData = data?.costData ?? [];

  return (
    <section className="mb-10">
      <h2 className="text-xl font-windsor-bold text-titleText mb-4">Data Trends</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-container p-4 rounded-lg shadow-md">
          <h3 className="text-md font-medium mb-4 text-titleText">Blob Base Fee over Time (gwei)</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">Loading chart data...</div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400 text-sm">Failed to load chart data</div>
            ) : baseFeeData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">No data available</div>
            ) : (
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
                    interval="preserveStartEnd"
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
                    dot={false}
                    name="Base Fee (gwei)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-container p-4 rounded-lg shadow-md">
          <h3 className="text-md font-medium mb-4 text-titleText">Blob Cost per Block (ETH)</h3>
          <div className="h-72">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">Loading chart data...</div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400 text-sm">Failed to load chart data</div>
            ) : costData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={costData}
                  margin={{ top: 5, right: 30, left: 30, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="time"
                    stroke="#888"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Time (UTC)', position: 'insideBottom', offset: -5, fill: '#888', fontSize: 12 }}
                    interval="preserveStartEnd"
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
                    dot={false}
                    name="Avg Blob Cost (ETH)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
