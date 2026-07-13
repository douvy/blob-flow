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

/**
 * Categorical palette for chart series identity. Series keys are hashed onto
 * these slots (see assignSeriesColors in src/utils), so any network the
 * backend starts reporting gets a stable, distinct color with no code change.
 *
 * Validated against the #14161a chart surface with the all-pairs check
 * (every pair, not just neighbors, since hash assignment controls no
 * ordering): worst pairwise deltaE 23.3 under normal vision and
 * protan/deutan/tritan simulation (target 12), and every slot clears 3:1
 * contrast. Revalidate if you change any value.
 */
export const SERIES_COLOR_PALETTE: readonly string[] = [
  '#575ce3', // indigo
  '#2fa58a', // teal
  '#dd410d', // orange
  '#957cdb', // lavender
  '#b54a48', // brick
  '#915a96', // plum
];

/**
 * Fixed neutrals for attribution categories that are not real networks.
 * "Other" and "Unknown" read as two clearly different grays (deltaE 30
 * between them, 4:1+ contrast on the surface) instead of taking hues that
 * would impersonate a network series.
 */
export const SERIES_CATEGORY_NEUTRALS: Record<string, string> = {
  other: '#c2c8d0',
  unknown: '#747781',
};

export const CHART_CARD_CLASS = 'rounded-lg border border-divider bg-[#14161a] p-3';
