import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { TrendingUp, Shield, Zap, BarChart3, Target, Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Advanced Crypto & Forex Trading Signals',
  description: 'Get real-time trading signals for cryptocurrency and forex markets. AI-powered analysis, technical indicators, and fundamental news integration for profitable trading decisions.',
  keywords: 'trading signals, crypto trading, forex signals, AMG Trading, cryptocurrency analysis, technical analysis, trading indicators, BTC signals, ETH signals',
  openGraph: {
    title: 'AMG Trading - Professional Trading Signals',
    description: 'Real-time crypto and forex trading signals with AI-powered analysis',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-gradient">
              Professional Trading Signals
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Real-time cryptocurrency and forex trading signals powered by advanced technical analysis,
              AI algorithms, and fundamental market insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-gradient-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity text-center"
              >
                View Live Signals
              </Link>
              <Link
                href="/completed"
                className="px-8 py-4 glass border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary/10 transition-colors text-center"
              >
                Track Record
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gradient">
            Why Choose AMG Trading?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="glass rounded-xl p-6 md:p-8 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Real-Time Signals</h3>
              <p className="text-muted-foreground">
                Get instant trading signals as market opportunities emerge. Our system monitors
                cryptocurrency and forex markets 24/7 to deliver timely alerts.
              </p>
            </div>

            <div className="glass rounded-xl p-6 md:p-8 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Advanced Technical Analysis</h3>
              <p className="text-muted-foreground">
                Powered by multiple indicators including RSI, MACD, Bollinger Bands, and moving averages
                for comprehensive market analysis.
              </p>
            </div>

            <div className="glass rounded-xl p-6 md:p-8 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">News Integration</h3>
              <p className="text-muted-foreground">
                Fundamental analysis integrated with technical signals. Market news and economic
                events are factored into signal confidence levels.
              </p>
            </div>

            <div className="glass rounded-xl p-6 md:p-8 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Precise Entry & Exit Points</h3>
              <p className="text-muted-foreground">
                Every signal includes calculated entry price, take profit targets, and stop loss
                levels based on market volatility and risk management.
              </p>
            </div>

            <div className="glass rounded-xl p-6 md:p-8 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Risk Management</h3>
              <p className="text-muted-foreground">
                Built-in risk management with ATR-based stop losses and dynamic position sizing
                recommendations to protect your capital.
              </p>
            </div>

            <div className="glass rounded-xl p-6 md:p-8 hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-primary">Track Record</h3>
              <p className="text-muted-foreground">
                Transparent performance tracking with detailed statistics on completed signals,
                win rates, and average profit percentages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gradient">
            Markets We Cover
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            <div className="glass rounded-xl p-6 md:p-8">
              <h3 className="text-2xl font-bold mb-4 text-primary">Cryptocurrency</h3>
              <p className="text-muted-foreground mb-4">
                Trade major cryptocurrencies with confidence:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  Bitcoin (BTC/USDT)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  Ethereum (ETH/USDT)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  BNB, XRP, ADA, SOL, and more
                </li>
              </ul>
            </div>

            <div className="glass rounded-xl p-6 md:p-8">
              <h3 className="text-2xl font-bold mb-4 text-primary">Forex</h3>
              <p className="text-muted-foreground mb-4">
                Major and minor forex pairs:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  EUR/USD, GBP/USD
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  USD/JPY, USD/CHF
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  AUD/USD, USD/CAD, and more
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gradient">
              Start Trading Smarter Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join traders who are making informed decisions with our professional trading signals.
              Real-time alerts, comprehensive analysis, and transparent performance tracking.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-4 bg-gradient-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
            >
              Access Live Signals Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">© 2025 AMG Trading. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">Design by Syed Raza Ali</p>
            <p>Professional trading signals for cryptocurrency and forex markets.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
