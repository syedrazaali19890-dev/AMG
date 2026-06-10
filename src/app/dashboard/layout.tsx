import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Signal Dashboard',
  description: 'Track and monitor active cryptocurrency and forex trading signals in real-time. View Calculated entries, Take Profit targets, and Stop Loss parameters with live accuracy stats.',
  keywords: ['live signals', 'trading dashboard', 'real-time trading', 'crypto signals', 'forex signals', 'trading updates'],
  openGraph: {
    title: 'Live Trading Signals Dashboard | AMG Trading',
    description: 'Track and monitor active cryptocurrency and forex trading signals in real-time with calculated parameters.',
    url: '/dashboard',
    type: 'website',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
