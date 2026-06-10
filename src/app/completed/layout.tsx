import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Record & History',
  description: 'View the historic performance, accuracy stats, and completed signals for crypto, forex, gold, and on-chain setups.',
  keywords: ['trading performance', 'trading track record', 'completed signals', 'signal accuracy', 'trading history', 'forex results', 'crypto results'],
  openGraph: {
    title: 'Trading Performance & Track Record | AMG Trading',
    description: 'View the historic performance, accuracy stats, and completed signals.',
    url: '/completed',
    type: 'website',
  },
};

export default function CompletedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
