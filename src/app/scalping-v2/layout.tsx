import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advanced Scalping (V2)',
  description: 'Advanced cryptocurrency scalping algorithms incorporating order block confirmations, liquidity sweep detection, and real-time live price tracking.',
  keywords: ['advanced scalping', 'scalping v2', 'liquidity sweep trading', 'order block indicators', 'live crypto scalping', 'algorithmic trading'],
  openGraph: {
    title: 'Advanced Scalping Signals (V2) | AMG Trading',
    description: 'Advanced cryptocurrency scalping algorithms with liquidity sweep and order block confirmations.',
    url: '/scalping-v2',
    type: 'website',
  },
};

export default function ScalpingV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
