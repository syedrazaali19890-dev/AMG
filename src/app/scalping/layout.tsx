import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crypto Scalping Signals',
  description: 'High-frequency cryptocurrency scalping signals. Access rapid trade setups with tight risk parameters (1-3% TP) for intraday trading success.',
  keywords: ['crypto scalping', 'scalping signals', 'intraday trading', 'day trading signals', 'fast crypto signals', 'scalp trades'],
  openGraph: {
    title: 'Crypto Scalping Signals | AMG Trading',
    description: 'High-frequency cryptocurrency scalping signals with rapid trade setups and tight risk parameters.',
    url: '/scalping',
    type: 'website',
  },
};

export default function ScalpingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
