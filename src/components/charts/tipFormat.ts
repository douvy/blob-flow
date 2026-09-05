import { formatScientific, RUNAWAY_GWEI_THRESHOLD } from '../../utils';

/** Axis tick for gwei-per-gas fees; tips span sub-gwei to tens of gwei. */
export function formatGweiTick(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= RUNAWAY_GWEI_THRESHOLD) return formatScientific(value);
  if (Math.abs(value) < 0.01) return value.toFixed(3);
  if (Math.abs(value) < 1) return value.toFixed(2);
  if (Math.abs(value) < 10) return value.toFixed(1);
  return Math.round(value).toString();
}
