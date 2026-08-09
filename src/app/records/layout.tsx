import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blob Market Records',
  description:
    'Records and milestones from the Ethereum EIP-4844 blob market: live full-block streaks, peak windowed base fees, busiest windows, biggest spenders, and per-rollup blob milestones.',
  alternates: {
    canonical: '/records',
  },
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
