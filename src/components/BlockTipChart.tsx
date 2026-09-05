"use client";

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BlockTipTransaction } from '@/lib/blockTips';
import { AXIS_STROKE, AXIS_LINE, AXIS_TICK } from '@/constants/chartTheme';
import { assignSeriesColors, attributionColorKey, formatGwei, truncateTxHash } from '@/utils';
import { ChartTooltipFrame, ChartTooltipRow } from './charts/ChartTooltip';
import { formatGweiTick } from './charts/tipFormat';

interface BlockTipChartProps {
  transactions: BlockTipTransaction[];
}

const ROW_HEIGHT = 30;
const CHART_PADDING = 44;

interface TipBarRow {
  label: string;
  colorKey: string;
  priorityFeeGwei: number;
  transaction: BlockTipTransaction;
}

/**
 * One bar per blob transaction in the block, highest tip first and colored
 * by sender attribution, so a block where one rollup outbid everyone else
 * for its slots reads at a glance.
 */
export default function BlockTipChart({ transactions }: BlockTipChartProps) {
  const rows = useMemo<TipBarRow[]>(
    () => transactions
      .filter((tx): tx is BlockTipTransaction & { priorityFeeGwei: number } => tx.priorityFeeGwei !== null)
      .map((tx) => ({
        label: `${tx.attribution} ${truncateTxHash(tx.txHash)}`,
        colorKey: attributionColorKey(tx.attribution),
        priorityFeeGwei: tx.priorityFeeGwei,
        transaction: tx,
      })),
    [transactions]
  );
  const colors = useMemo(
    () => assignSeriesColors(rows.map((row) => ({ key: row.colorKey }))),
    [rows]
  );

  if (rows.length === 0) return null;

  return (
    <div style={{ height: rows.length * ROW_HEIGHT + CHART_PADDING }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barCategoryGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} horizontal={false} />
          <XAxis
            type="number"
            stroke={AXIS_STROKE}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={AXIS_LINE}
            tickFormatter={formatGweiTick}
            domain={[0, 'auto']}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            stroke={AXIS_STROKE}
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: '#ffffff', fillOpacity: 0.04 }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const row = payload[0].payload as TipBarRow;
              const tx = row.transaction;
              return (
                <ChartTooltipFrame label={tx.attribution}>
                  <ChartTooltipRow label="Tip" value={formatGwei(row.priorityFeeGwei, 4)} />
                  <ChartTooltipRow
                    label="Blobs"
                    value={`${tx.blobCount} ${tx.blobCount === 1 ? 'blob' : 'blobs'}`}
                  />
                  <ChartTooltipRow label="Tx" value={truncateTxHash(tx.txHash)} />
                </ChartTooltipFrame>
              );
            }}
          />
          <Bar dataKey="priorityFeeGwei" name="Tip" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell key={row.transaction.txHash} fill={colors[row.colorKey]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
