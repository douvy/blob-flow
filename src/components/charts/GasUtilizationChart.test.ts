import { describe, expect, it } from 'vitest';
import { getAvgLabelPosition } from './GasUtilizationChart';

const TARGET_GAS = 9_175_040;
const MAX_GAS = 13_762_560;

describe('getAvgLabelPosition', () => {
  it('keeps Avg at the right edge when the line is clear of Target and Max', () => {
    const avgAtHalfTarget = Math.round(TARGET_GAS * 0.5);
    expect(getAvgLabelPosition(TARGET_GAS, MAX_GAS, avgAtHalfTarget)).toBe('insideRight');
  });

  it('moves Avg to the left edge when average utilization hits 100%', () => {
    expect(getAvgLabelPosition(TARGET_GAS, MAX_GAS, TARGET_GAS)).toBe('insideLeft');
  });

  it('moves Avg to the left edge when the line is close to Target', () => {
    const avgJustBelowTarget = Math.round(TARGET_GAS * 0.95);
    expect(getAvgLabelPosition(TARGET_GAS, MAX_GAS, avgJustBelowTarget)).toBe('insideLeft');
  });

  it('moves Avg to the left edge when the line is close to Max', () => {
    const avgNearMax = Math.round(MAX_GAS * 0.98);
    expect(getAvgLabelPosition(TARGET_GAS, MAX_GAS, avgNearMax)).toBe('insideLeft');
  });

  it('ignores unset reference lines', () => {
    expect(getAvgLabelPosition(0, 0, TARGET_GAS)).toBe('insideRight');
    expect(getAvgLabelPosition(TARGET_GAS, MAX_GAS, 0)).toBe('insideRight');
  });
});
