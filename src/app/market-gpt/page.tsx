'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { OrderBookView } from '@/components/market-gpt/OrderBookView';
import { DepthChart } from '@/components/market-gpt/DepthChart';
import { OrderFlowStream } from '@/components/market-gpt/OrderFlowStream';
import { SimulatorControls } from '@/components/market-gpt/SimulatorControls';
import { MarketStats } from '@/components/market-gpt/MarketStats';
import {
    OrderBookEngine,
    OrderBookSnapshot,
    MarketStatsData,
    OrderEvent,
    SimulatorConfig,
    MarketEventType,
} from '@/lib/marketgpt/orderBookEngine';

export default function MarketGPTPage() {
    // Engine ref (persists across renders without triggering re-renders)
    const engineRef = useRef<OrderBookEngine | null>(null);

    // State for UI
    const [isRunning, setIsRunning] = useState(false);
    const [config, setConfig] = useState<SimulatorConfig>(() => {
        const engine = new OrderBookEngine();
        return engine.getConfig();
    });
    const [snapshot, setSnapshot] = useState<OrderBookSnapshot | null>(null);
    const [stats, setStats] = useState<MarketStatsData | null>(null);
    const [events, setEvents] = useState<OrderEvent[]>([]);

    // Initialize engine
    useEffect(() => {
        const engine = new OrderBookEngine();
        engineRef.current = engine;

        // Set initial snapshot
        setSnapshot(engine.getSnapshot());
        setStats(engine.getStats());
        setEvents(engine.getRecentEvents(60));

        return () => {
            engine.stop();
        };
    }, []);

    // Simulation loop
    useEffect(() => {
        if (!isRunning || !engineRef.current) return;

        const engine = engineRef.current;
        engine.start();

        // Tick interval based on speed
        const baseInterval = 150; // ms
        const interval = Math.max(30, baseInterval / config.speed);

        const timer = setInterval(() => {
            const newEvents = engine.tick();

            // Batch state updates
            setSnapshot(engine.getSnapshot());
            setStats(engine.getStats());
            setEvents(prev => {
                const combined = [...prev, ...newEvents];
                return combined.slice(-200); // Keep last 200
            });
        }, interval);

        return () => {
            clearInterval(timer);
            engine.stop();
        };
    }, [isRunning, config.speed]);

    // Handlers
    const handleToggleRun = useCallback(() => {
        setIsRunning(prev => !prev);
    }, []);

    const handleReset = useCallback(() => {
        setIsRunning(false);
        const engine = new OrderBookEngine({ symbol: config.symbol });
        engineRef.current = engine;
        setConfig(engine.getConfig());
        setSnapshot(engine.getSnapshot());
        setStats(engine.getStats());
        setEvents([]);
    }, [config.symbol]);

    const handleConfigChange = useCallback((partial: Partial<SimulatorConfig>) => {
        if (engineRef.current) {
            // If symbol changed, do a full reset with the new symbol
            if (partial.symbol && partial.symbol !== config.symbol) {
                setIsRunning(false);
                const engine = new OrderBookEngine({ symbol: partial.symbol });
                engineRef.current = engine;
                setConfig(engine.getConfig());
                setSnapshot(engine.getSnapshot());
                setStats(engine.getStats());
                setEvents([]);
                return;
            }
            engineRef.current.updateConfig(partial);
            setConfig(prev => ({ ...prev, ...partial }));
        }
    }, [config.symbol]);

    const handleTriggerEvent = useCallback((eventType: MarketEventType) => {
        if (engineRef.current) {
            const newEvents = engineRef.current.triggerMarketEvent(eventType);
            setSnapshot(engineRef.current.getSnapshot());
            setStats(engineRef.current.getStats());
            setEvents(prev => {
                const combined = [...prev, ...newEvents];
                return combined.slice(-200);
            });
        }
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-6">
                {/* Page Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-gradient mb-1">
                                MarketGPT Simulator
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Interactive order book simulator • Inspired by{' '}
                                <a
                                    href="https://arxiv.org/abs/2411.16585"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    MarketGPT (Cornell, 2024)
                                </a>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                                isRunning
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-muted/50 text-muted-foreground'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                                {isRunning ? 'LIVE' : 'PAUSED'}
                            </span>
                            <span className="text-xs text-muted-foreground/50 font-mono">
                                {config.symbol} • {config.speed}× speed
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Main Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Column: Controls + Stats */}
                    <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <SimulatorControls
                                config={config}
                                isRunning={isRunning}
                                onToggleRun={handleToggleRun}
                                onReset={handleReset}
                                onConfigChange={handleConfigChange}
                                onTriggerEvent={handleTriggerEvent}
                            />
                        </motion.div>

                        {stats && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <MarketStats stats={stats} symbol={config.symbol} />
                            </motion.div>
                        )}
                    </div>

                    {/* Center Column: Order Book + Depth Chart */}
                    <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
                        {snapshot && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="h-[500px] sm:h-[560px]"
                                >
                                    <OrderBookView
                                        bids={snapshot.bids}
                                        asks={snapshot.asks}
                                        midPrice={snapshot.midPrice}
                                        spread={snapshot.spread}
                                        lastTradePrice={snapshot.lastTradePrice}
                                        lastTradeSide={snapshot.lastTradeSide}
                                        symbol={config.symbol}
                                    />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="h-[260px] sm:h-[300px]"
                                >
                                    <DepthChart
                                        bids={snapshot.bids}
                                        asks={snapshot.asks}
                                        midPrice={snapshot.midPrice}
                                    />
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* Right Column: Order Flow Stream */}
                    <div className="lg:col-span-4 order-3">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="h-[500px] sm:h-[880px]"
                        >
                            <OrderFlowStream
                                events={events}
                                symbol={config.symbol}
                            />
                        </motion.div>
                    </div>
                </div>

                {/* Info Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 glass rounded-xl p-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                🧠 About MarketGPT
                            </h4>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                MarketGPT is a simulation platform by Wheeler & Varner (Cornell, 2024) that uses a 100M-parameter
                                GPT model to generate realistic order flow within a discrete event simulator, trained on
                                NASDAQ ITCH 5.0 data.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                📊 How This Simulator Works
                            </h4>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                This client-side simulator models limit order book dynamics with realistic Add, Cancel, and
                                Execute events. Price follows a mean-reverting random walk with momentum. Order sizes use
                                log-normal distributions.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                ⚡ Market Events
                            </h4>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                                Trigger Flash Crashes, Earnings Spikes, FOMC Volatility, or Whale orders to see how the
                                order book responds. Watch liquidity vanish during crashes and rebuild after.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
