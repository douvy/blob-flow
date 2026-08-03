import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flippening Watch',
  description:
    'Track when one rollup overtakes another in Ethereum blob share: recent crossover events and the pair closest to flipping.',
  alternates: {
    canonical: '/flippening',
  },
};

export default function FlippeningLayout({ children }: { children: React.ReactNode }) {
  return children;
}
