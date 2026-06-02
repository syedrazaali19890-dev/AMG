'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { SignalList } from '@/components/ui/SignalList';
import { StatsCard } from '@/components/ui/StatsCard';
import { MessageBox, useMessages } from '@/components/ui/MessageBox';
import { Signal, SignalType, MarketType, SignalDirection, SignalStatus } from '@/lib/signals/types';
import { SignalDirectionFilter } from '@/components/ui/SignalDirectionFilter';
import { ScalpingSignalGenerator } from '@/lib/signals/scalpingGenerator';
import { MarketDataManager } from '@/lib/signals/marketData';
import { SignalManager } from '@/lib/services/signalManager';
import { AutoGenerator } from '@/lib/services/autoGenerator';
import { SignalCatchup } from '@/lib/services/signalCatchup';
import { useSignals } from '@/hooks/useSignals';
import { TrendingUp, Target, Activity, Award, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScalpingPage() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<'CRYPTO' | 'FOREX' | null>(null);
    const [selectedType, setSelectedType] = useState<'SPOT' | 'FUTURE' | null>(null);
    const [selectedDirections, setSelectedDirections] = useState<SignalDirection[]>(() => {
        // FUTURES: LONG + SHORT, SPOT: BUY only
        return [SignalDirection.LONG, SignalDirection.SHORT, SignalDirection.BUY];
    });

    // Auto-migrate old signals to new SignalManager format (one-time fix)
    useEffect(() => {
        try {
            const oldScalpingSignals = localStorage.getItem('scalpingSignals');
            if (oldScalpingSignals && oldScalpingSignals !== '[]') {
                console.log('🔄 Migrating old scalping signals to new format...');
                const oldSignals = JSON.parse(oldScalpingSignals);

                // Check if activeSignals already has them
                const currentSignals = SignalManager.getActiveSignals('scalping');
                if (currentSignals.length === 0 && oldSignals.length > 0) {
                    // Migrate old signals
                    SignalManager.setActiveSignals(oldSignals, 'scalping');
                    console.log(`✅ Migrated ${oldSignals.length} scalping signals`);

                    // Clear old storage
                    localStorage.removeItem('scalpingSignals');
                }
            }
        } catch (error) {
            console.error('Migration error:', error);
        }

        // INSTANT CATCH-UP: Check all signals against current prices
        SignalCatchup.catchupAllSignals().catch(err => {
            console.error('Catch-up error:', err);
        });
    }, []);
    const [autoGenEnabled, setAutoGenEnabled] = useState(false);
    const [nextGenTime, setNextGenTime] = useState(0);
    const { showSuccess, showError, showInfo } = useMessages();

    // Load signals from SignalManager on mount and refresh every second
    useEffect(() => {
        const loadSignals = () => {
            const activeSignals = SignalManager.getActiveSignals('scalping');
            setSignals(activeSignals);
        };

        loadSignals();
        const interval = setInterval(loadSignals, 1000);
        return () => clearInterval(interval);
    }, []);

    // Check auto-generation status
    useEffect(() => {
        const prefs = SignalManager.getAutoGenPreferences();
        setAutoGenEnabled(prefs.scalping.enabled);
    }, []);

    // Update next generation countdown
    useEffect(() => {
        if (!autoGenEnabled) {
            setNextGenTime(0);
            return;
        }

        // Update immediately when enabled
        const updateTime = () => {
            const timeLeft = AutoGenerator.timeUntilNext('scalping');
            setNextGenTime(timeLeft);
        };

        updateTime(); // Initial update

        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [autoGenEnabled]);

    // AUTO-START: When market and type are selected, auto-enable generation and generate signals
    useEffect(() => {
        if (!selectedMarket || !selectedType) return;

        // Check if we already have signals FOR THIS MARKET
        const existingSignals = SignalManager.getActiveSignals('scalping');
        const hasRelevantSignals = existingSignals.some(s => s.marketType === selectedMarket);

        // If no relevant signals, generate them automatically
        if (!hasRelevantSignals) {
            console.log(`🤖 Auto-starting scalping signal generation for ${selectedMarket}...`);
            generateScalpingSignals();
        }

        // CRITICAL FIX: Always restart auto-generation when market/type selected
        // This ensures the interval is running even after page reload
        // The AutoGenerator is a static class that loses its intervals on reload
        const prefs = SignalManager.getAutoGenPreferences();
        if (prefs.scalping.enabled || !autoGenEnabled) {
            console.log('🤖 (Re)starting auto-generation for scalping...');
            AutoGenerator.startAutoGeneration('scalping', {
                market: selectedMarket,
                signalType: selectedType,
                enabled: true
            });
            setAutoGenEnabled(true);
        }
    }, [selectedMarket, selectedType]); // Run when market/type changes

    const generateScalpingSignals = async () => {
        if (!selectedMarket || !selectedType) return;

        setIsLoading(true);

        try {
            const allPairs = MarketDataManager.getAllPairs();
            const filteredPairs = allPairs
                .filter(({ marketType }) =>
                    selectedMarket === 'CRYPTO' ? marketType === MarketType.CRYPTO : marketType === MarketType.FOREX
                )
                .sort(() => Math.random() - 0.5) // Shuffle for random selection
                .slice(0, 30); // Random 30 pairs each time

            const signalTypeEnum = selectedType === 'SPOT' ? SignalType.SPOT : SignalType.FUTURE;
            const generatedSignals = await ScalpingSignalGenerator.generateScalpingSignals(
                filteredPairs,
                signalTypeEnum
            );

            // Save to SignalManager instead of local state
            SignalManager.setActiveSignals(generatedSignals, 'scalping');
            setIsLoading(false);

            if (generatedSignals.length > 0) {
                showSuccess(
                    `⚡ ${generatedSignals.length} Scalping Signals`,
                    'Quick profits in 15-60 minutes!'
                );
            }
        } catch (error) {
            console.error('Error:', error);
            setIsLoading(false);
            showError('Generation Failed', 'Please try again');
        }
    };

    // Calculate stats
    const filteredSignals = signals.filter(signal =>
        selectedDirections.includes(signal.direction) &&
        signal.marketType === selectedMarket
    );

    const stats = {
        totalSignals: filteredSignals.length,
        activeSignals: filteredSignals.filter(s => s.status === 'ACTIVE').length,
        completedSignals: filteredSignals.filter(s => s.tp2Hit || s.tp3Hit).length,
        avgProfit: filteredSignals.reduce((acc, s) => acc + (s.profitLossPercentage || 0), 0) / (filteredSignals.length || 1)
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <MessageBox messages={[]} onDismiss={() => { }} />

            <div className="container mx-auto px-4 py-8">
                {/* Scalping Mode Badge */}
                <div className="flex items-center justify-center mb-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full px-6 py-3 flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
                        <span className="text-yellow-500 font-bold text-lg">⚡ SCALPING MODE ⚡</span>
                        <span className="text-sm text-muted-foreground">5-min candles • 1-3% targets</span>
                    </div>
                </div>

                {/* Market Selection */}
                {!selectedMarket && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto text-center mb-12"
                    >
                        <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                            Quick Scalping Signals
                        </h1>
                        <p className="text-muted-foreground mb-8">
                            Fast trading • 15-60 minute targets • 1-3% profits
                        </p>

                        <div className="grid grid-cols-2 gap-6">
                            <button
                                onClick={() => {
                                    setSelectedMarket('CRYPTO');
                                    showInfo('CRYPTO Selected', 'Choose trading type');
                                }}
                                className="p-8 rounded-xl bg-card border border-border hover:border-blue-500 transition-all"
                            >
                                <div className="text-3xl mb-3">₿</div>
                                <h3 className="text-xl font-bold">Cryptocurrency</h3>
                            </button>

                            <button
                                onClick={() => {
                                    setSelectedMarket('FOREX');
                                    setSelectedType('FUTURE'); // Use FUTURE to enable Long/Short signals for Forex
                                    setTimeout(generateScalpingSignals, 100);
                                    showInfo('FOREX Selected', 'Generating signals...');
                                }}
                                className="p-8 rounded-xl bg-card border border-border hover:border-green-500 transition-all"
                            >
                                <div className="text-3xl mb-3">💱</div>
                                <h3 className="text-xl font-bold">Forex / Gold</h3>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Type Selection - ONLY FOR CRYPTO */}
                {selectedMarket === 'CRYPTO' && !selectedType && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto text-center"
                    >
                        <h2 className="text-2xl font-bold mb-6">
                            {selectedMarket} Scalping
                        </h2>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <button
                                onClick={() => {
                                    setSelectedType('SPOT');
                                    setTimeout(generateScalpingSignals, 100);
                                }}
                                className="px-6 py-3 rounded-lg font-bold bg-gradient-primary text-white"
                            >
                                Spot Trading
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedType('FUTURE');
                                    setTimeout(generateScalpingSignals, 100);
                                }}
                                className="px-6 py-3 rounded-lg font-bold bg-gradient-primary text-white"
                            >
                                Futures
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Signals Display */}
                {selectedMarket && selectedType && (
                    <>
                        {/* Signal Direction Filter */}
                        <div className="mb-6">
                            <SignalDirectionFilter
                                selectedDirections={selectedDirections}
                                onDirectionsChange={setSelectedDirections}
                                signalType={selectedType}
                            />
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <StatsCard title="Total Signals" value={stats.totalSignals} icon={TrendingUp} />
                            <StatsCard title="Active Signals" value={stats.activeSignals} icon={Activity} />
                            <StatsCard
                                title="Completed"
                                value={stats.completedSignals}
                                icon={Award}
                                trend={{ value: (stats.completedSignals / (stats.totalSignals || 1)) * 100, isPositive: true }}
                            />
                            <StatsCard
                                title="Avg Profit"
                                value={`${stats.avgProfit.toFixed(2)}%`}
                                icon={Target}
                                trend={{ value: stats.avgProfit, isPositive: stats.avgProfit > 0 }}
                            />
                        </div>

                        {/* Auto-Generation Toggle */}
                        <div className="mb-6 p-4 rounded-lg bg-card border border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-yellow-500" />
                                    <div>
                                        <h3 className="font-semibold">Auto-Generate Signals</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {autoGenEnabled
                                                ? `Next generation in ${Math.floor(nextGenTime / 60)}m ${nextGenTime % 60}s`
                                                : 'Generate signals every 15 minutes automatically'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!selectedMarket || !selectedType) {
                                            showError('Select Options', 'Choose market and type first');
                                            return;
                                        }

                                        if (autoGenEnabled) {
                                            AutoGenerator.stopAutoGeneration('scalping');
                                            setAutoGenEnabled(false);
                                            showInfo('Auto-Gen Stopped', 'Stopped automatic generation');
                                        } else {
                                            AutoGenerator.startAutoGeneration('scalping', {
                                                market: selectedMarket,
                                                signalType: selectedType,
                                                enabled: true
                                            });
                                            setAutoGenEnabled(true);
                                            showSuccess('Auto-Gen Started', 'Signals will generate every 15 mins');
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${autoGenEnabled
                                        ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                                        : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                        }`}
                                >
                                    {autoGenEnabled ? 'Stop Auto-Gen' : 'Enable Auto-Gen'}
                                </button>
                            </div>
                        </div>

                        {/* Generate New Signals Button */}
                        <div className="flex justify-center mb-6">
                            <button
                                onClick={generateScalpingSignals}
                                disabled={isLoading}
                                className="px-8 py-3 bg-gradient-primary text-white rounded-lg font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <Zap className="w-5 h-5" />
                                {isLoading ? 'Generating...' : 'Generate New Signals'}
                            </button>
                        </div>

                        {/* Loading or Signals List */}
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                <p className="text-muted-foreground">Generating scalping signals...</p>
                            </div>
                        ) : (
                            <SignalList signals={filteredSignals} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
