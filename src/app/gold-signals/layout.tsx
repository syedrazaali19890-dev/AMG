import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gold & FX Signals',
  description: 'Elite institutional ICT setups for Gold (XAU/USD) and major Forex pairs. Access premium daily bias, liquidity sweeps, and order block analysis.',
  keywords: ['gold signals', 'forex signals', 'XAUUSD trading', 'ICT strategy', 'liquidity sweep', 'order block confirmation', 'fx setups'],
  openGraph: {
    title: 'Gold & FX Trading Signals | AMG Trading',
    description: 'Elite institutional ICT setups for Gold (XAU/USD) and major Forex pairs.',
    url: '/gold-signals',
    type: 'website',
  },
};

export default function GoldSignalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
