import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'On-Chain Whale Signals',
  description: 'Monitor institutional smart money and large wallet flows combined with technical breakout indicators. Track transaction values exceeding $1M for high-yield targets.',
  keywords: ['on-chain signals', 'whale tracking', 'smart money tracking', 'wallet inflow', 'exchange flow crypto', 'large transactions'],
  openGraph: {
    title: 'On-Chain Whale Trading Signals | AMG Trading',
    description: 'Monitor institutional smart money and large wallet flows with technical breakout indicators.',
    url: '/on-chain',
    type: 'website',
  },
};

export default function OnChainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
