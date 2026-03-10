/** Recharts tooltip style matching the app dark theme */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#14161a',
  borderColor: '#333',
  fontSize: '12px',
  borderRadius: '8px',
  padding: '8px',
};

export const CHART_LABEL_STYLE = { color: '#fff', fontSize: '12px' };
export const CHART_ITEM_STYLE = { color: '#fff', fontSize: '12px' };

export const AXIS_STROKE = '#6e7687';
export const AXIS_LINE = { stroke: '#333' };
export const AXIS_TICK = { fill: '#6e7687', fontSize: 11 };
export const GRID_STROKE = '#333';

export const COLORS = {
  blue: '#3B55E6',
  purple: '#6A5ACD',
  green: '#66CC99',
  red: '#FF6B6B',
  yellow: '#F0C040',
  lightBlue: '#9ac4fd',
};

export const L2_COLORS: Record<string, string> = {
  arbitrum: '#12aaff',
  optimism: '#ff0420',
  base: '#1652f0',
  zksync: '#8B8DFC',
  unknown: '#6e7687',
};

export const CHART_CARD_CLASS =
  "rounded-tl-lg mb-2 border border-divider rounded-tr-lg rounded-bl-lg bg-blue/10 p-3 relative after:content-[''] after:absolute after:border-b-[10px] after:border-r-[10px] after:border-[#171c28] after:right-0 after:bottom-0 after:w-full after:h-full after:pointer-events-none after:rounded-br-lg after:rounded-bl-lg after:rounded-tr-lg after:-right-0 after:-bottom-0 after:left-[11px] after:top-[11px]";
