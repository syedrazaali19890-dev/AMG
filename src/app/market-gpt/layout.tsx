import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MarketGPT Simulator',
  description: 'Interactive order book simulator inspired by MarketGPT (Cornell University). Visualize real-time limit order book dynamics, order flow events, and market depth with configurable parameters.',
  keywords: ['order book', 'market simulator', 'MarketGPT', 'limit order book', 'order flow', 'trading simulator', 'NASDAQ ITCH'],
  openGraph: {
    title: 'MarketGPT Order Book Simulator | AMG Trading',
    description: 'Interactive order book simulator with real-time visualization of limit order book dynamics, depth charts, and order flow streaming.',
    url: '/market-gpt',
    type: 'website',
  },
};

export default function MarketGPTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
