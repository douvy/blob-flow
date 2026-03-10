"use client";

import React, { useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useApiData } from '@/hooks/useApiData';
import { getChartData, ChartData } from '@/lib/api/charts';
import { useNetwork } from '@/hooks/useNetwork';

export default function MetricsCharts() {
  const { selectedNetwork } = useNetwork();
  const fetchCharts = useCallback(() => getChartData(selectedNetwork.apiParam), [selectedNetwork]);
  const { data, isLoading, error } = useApiData<ChartData>(fetchCharts, [selectedNetwork]);

  const baseFeeData = data?.baseFeeData ?? [];
  const costData = data?.costData ?? [];

  return (
    <section>
      <h2 className="text-2xl font-windsor-bold text-white mb-3">Data Trends</h2>
      <div className="flex flex-col space-y-6">
        <div className="rounded-tl-lg mb-2 border border-divider rounded-tr-lg rounded-bl-lg bg-blue/10 p-3 relative after:content-[''] after:absolute after:border-b-[10px] after:border-r-[10px] after:border-[#171c28] after:right-0 after:bottom-0 after:w-full after:h-full after:pointer-events-none after:rounded-br-lg after:rounded-bl-lg after:rounded-tr-lg after:-right-0 after:-bottom-0 after:left-[11px] after:top-[11px]">
          <h3 className="text-md font-medium mb-4 text-white">Blob Base Fee over Time (gwei)</h3>
          <div className="h-56 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">Loading chart data...</div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400 text-sm">Failed to load chart data</div>
            ) : baseFeeData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">No data available</div>
            ) : (
              <>
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
                      interval="preserveStartEnd"
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
                      dot={false}
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
              </>
            )}
          </div>
        </div>

        <div className="rounded-tl-lg border border-divider rounded-tr-lg rounded-bl-lg bg-blue/10 p-3 relative after:content-[''] after:absolute after:border-b-[10px] after:border-r-[10px] after:border-[#171c28] after:right-0 after:bottom-0 after:w-full after:h-full after:pointer-events-none after:rounded-br-lg after:rounded-bl-lg after:rounded-tr-lg after:-right-0 after:-bottom-0 after:left-[11px] after:top-[11px]">
          <h3 className="text-md font-medium mb-4 text-white">Blob Cost per Block (ETH)</h3>
          <div className="h-56 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">Loading chart data...</div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-400 text-sm">Failed to load chart data</div>
            ) : costData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#6e7687] text-sm">No data available</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={costData}
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
                      interval="preserveStartEnd"
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
                      dot={false}
                      name="Avg Blob Cost (ETH)"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[#6e7687]">
                  <span className="inline-flex items-center mr-4">
                    <span className="inline-block w-3 h-3 mr-1 rounded-sm" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></span>
                    Avg Blob Cost (ETH)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
