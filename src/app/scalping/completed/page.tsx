'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { SignalCard } from '@/components/ui/SignalCard';
import { Signal } from '@/lib/signals/types';
import { motion } from 'framer-motion';
import { TrendingUp, Trophy, Target, Zap } from 'lucide-react';

export default function ScalpingCompletedPage() {
    const [completedSignals, setCompletedSignals] = useState<(Signal & { completedAt: string; uniqueKey?: string })[]>([]);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'CRYPTO' | 'FOREX'>('CRYPTO');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Load scalping completed signals from localStorage
        const saved = localStorage.getItem('completedSignals');
        if (saved) {
            try {
                const allSignals = JSON.parse(saved);

                // Filter ONLY scalping signals
                const scalpingSignals = allSignals.filter((s: any) => s.isScalping === true);

                // Deduplicate by ID
                const uniqueSignalsMap = new Map<string, any>();
                scalpingSignals.forEach((signal: any) => {
                    uniqueSignalsMap.set(signal.id, signal);
                });

                const uniqueSignals = Array.from(uniqueSignalsMap.values());

                // Add unique keys and migrate TPs
                const migratedSignals = uniqueSignals.map((signal: any, index: number) => {
                    if (!signal.takeProfit1 || !signal.takeProfit2 || !signal.takeProfit3) {
                        const isBuyOrLong = signal.direction === 'BUY' || signal.direction === 'LONG';
                        if (isBuyOrLong) {
                            const tpDistance = signal.takeProfit - signal.entryPrice;
                            signal.takeProfit1 = signal.entryPrice + (tpDistance * 0.30);
                            signal.takeProfit2 = signal.entryPrice + (tpDistance * 0.60);
                            signal.takeProfit3 = signal.takeProfit;
                        } else {
                            const tpDistance = signal.entryPrice - signal.takeProfit;
                            signal.takeProfit1 = signal.entryPrice - (tpDistance * 0.30);
                            signal.takeProfit2 = signal.entryPrice - (tpDistance * 0.60);
                            signal.takeProfit3 = signal.takeProfit;
                        }
                        signal.tp1Hit = true;
                        signal.tp2Hit = true;
                        signal.tp3Hit = true;
                    }

                    const timestamp = signal.completedAt || new Date().toISOString();
                    signal.uniqueKey = `scalping-${signal.id}-${index}-${timestamp.replace(/[:.]/g, '')}`;

                    // VALIDATE MARKET TYPE
                    if (!signal.marketType) {
                        // Infer from pair format if missing
                        if (signal.pair.includes('/') && !signal.pair.endsWith('USDT')) {
                            signal.marketType = 'FOREX';
                        } else {
                            signal.marketType = 'CRYPTO';
                        }
                    }

                    return signal;
                });

                // Sort by completion date
                migratedSignals.sort((a: any, b: any) => {
                    const dateA = new Date(a.completedAt || 0).getTime();
                    const dateB = new Date(b.completedAt || 0).getTime();
                    return dateB - dateA;
                });

                setCompletedSignals(migratedSignals);
            } catch (error) {
                console.error('Error loading scalping signals:', error);
                setCompletedSignals([]);
            }
        }
    }, [mounted]);

    // FILTER SIGNALS BY TAB
    const filteredSignals = completedSignals.filter(s => s.marketType === activeTab);

    // Calculate statistics based on FILTERED signals
    const profitableSignals = filteredSignals.filter(s => (s.profitLossPercentage || 0) > 0);
    const lossSignals = filteredSignals.filter(s => (s.profitLossPercentage || 0) < 0);
    const totalProfit = filteredSignals.reduce((sum, s) => sum + (s.profitLossPercentage || 0), 0);
    const avgProfit = filteredSignals.length > 0 ? totalProfit / filteredSignals.length : 0;
    const winRate = filteredSignals.length > 0 ? (profitableSignals.length / filteredSignals.length) * 100 : 0;
    const bestTrade = Math.max(...filteredSignals.map(s => s.profitLossPercentage || 0), 0);
    const worstTrade = Math.min(...filteredSignals.map(s => s.profitLossPercentage || 0), 0);

    // Group by date
    const groupedByDate = filteredSignals.reduce((groups: any, signal) => {
        const date = new Date(signal.completedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(signal);
        return groups;
    }, {});

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                <Zap className="w-8 h-8 text-green-500" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-gradient">Scalping Completed</h1>
                                <p className="text-muted-foreground">History of completed trades</p>
                            </div>
                        </div>

                        {/* TAB FILTER */}
                        <div className="flex bg-muted/20 p-1 rounded-lg border border-border/50">
                            <button
                                onClick={() => setActiveTab('CRYPTO')}
                                className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'CRYPTO'
                                    ? 'bg-background shadow-sm text-blue-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Crypto
                            </button>
                            <button
                                onClick={() => setActiveTab('FOREX')}
                                className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'FOREX'
                                    ? 'bg-background shadow-sm text-green-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Forex
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Statistics */}
                {filteredSignals.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    >
                        <div className="glass-card p-4 rounded-xl">
                            <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                            <p className="text-sm text-muted-foreground">Total Signals</p>
                            <p className="text-2xl font-bold">{filteredSignals.length}</p>
                        </div>

                        <div className="glass-card p-4 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-green-500 mb-2" />
                            <p className="text-sm text-muted-foreground">Profitable</p>
                            <p className="text-2xl font-bold text-green-500">
                                {profitableSignals.length} <span className="text-sm">({winRate.toFixed(1)}%)</span>
                            </p>
                        </div>

                        <div className="glass-card p-4 rounded-xl">
                            <Target className="w-6 h-6 text-blue-500 mb-2" />
                            <p className="text-sm text-muted-foreground">Avg Profit</p>
                            <p className={`text-2xl font-bold ${avgProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {avgProfit >= 0 ? '+' : ''}{avgProfit.toFixed(2)}%
                            </p>
                        </div>

                        <div className="glass-card p-4 rounded-xl">
                            <Zap className="w-6 h-6 text-purple-500 mb-2" />
                            <p className="text-sm text-muted-foreground">Best Trade</p>
                            <p className="text-2xl font-bold text-green-500">+{bestTrade.toFixed(2)}%</p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="text-center py-8 mb-8 bg-muted/10 rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground">No completed {activeTab} signals yet</p>
                    </div>
                )}

                {/* Signals Display */}
                {completedSignals.length > 0 ? (
                    <div className="space-y-8">
                        {Object.entries(groupedByDate).map(([date, signals]: [string, any]) => (
                            <div key={date}>
                                <h3 className="text-lg font-semibold mb-4 text-primary/70">{date}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {signals.map((signal: any) => (
                                        <motion.div
                                            key={signal.uniqueKey}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <SignalCard signal={signal} />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                        <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No Completed Scalping Signals Yet</h3>
                        <p className="text-muted-foreground">
                            Scalping signals that hit their targets will appear here
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
