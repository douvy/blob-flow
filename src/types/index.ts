// Metric type definition
export interface Metric {
  title: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

// Block type definition
export interface Block {
  id: number;
  number: string;
  blobCount: number;
  timestamp: string;
  attribution: string[];
}