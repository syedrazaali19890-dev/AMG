'use client';

import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, TrendingDown, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { SimulatorConfig, MarketEventType, OrderBookEngine } from '@/lib/marketgpt/orderBookEngine';

interface SimulatorControlsProps {
    config: SimulatorConfig;
    isRunning: boolean;
    onToggleRun: () => void;
    onReset: () => void;
    onConfigChange: (partial: Partial<SimulatorConfig>) => void;
    onTriggerEvent: (eventType: MarketEventType) => void;
}

const SPEED_OPTIONS = [
    { value: 0.5, label: '0.5×' },
    { value: 1, label: '1×' },
    { value: 2, label: '2×' },
    { value: 5, label: '5×' },
];

const SYMBOLS = OrderBookEngine.getSymbols();

export function SimulatorControls({
    config,
    isRunning,
    onToggleRun,
    onReset,
    onConfigChange,
    onTriggerEvent,
}: SimulatorControlsProps) {
    return (
        <div className="glass rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    Simulator Controls
                </h3>

                {/* Play / Pause / Reset */}
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onToggleRun}
                        className={`p-2.5 rounded-lg font-bold transition-all ${
                            isRunning
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        }`}
                    >
                        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onReset}
                        className="p-2.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Symbol Selector */}
            <div>
                <label className="text-xs text-muted-foreground/70 block mb-1.5">Symbol</label>
                <div className="grid grid-cols-5 gap-1">
                    {Object.keys(SYMBOLS).map(sym => (
                        <button
                            key={sym}
                            onClick={() => onConfigChange({ symbol: sym })}
                            className={`text-[10px] font-bold py-1.5 px-1 rounded-lg transition-all ${
                                config.symbol === sym
                                    ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                        >
                            {sym}
                        </button>
                    ))}
                </div>
            </div>

            {/* Speed */}
            <div>
                <label className="text-xs text-muted-foreground/70 block mb-1.5">Speed</label>
                <div className="grid grid-cols-4 gap-1">
                    {SPEED_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => onConfigChange({ speed: opt.value })}
                            className={`text-xs font-bold py-2 rounded-lg transition-all ${
                                config.speed === opt.value
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Volatility Slider */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground/70">Volatility</label>
                    <span className="text-xs font-mono text-foreground/70">{config.volatility}%</span>
                </div>
                <input
                    type="range"
                    min={5}
                    max={100}
                    value={config.volatility}
                    onChange={e => onConfigChange({ volatility: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/40 mt-0.5">
                    <span>Calm</span>
                    <span>Volatile</span>
                </div>
            </div>

            {/* Order Frequency Slider */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground/70">Order Frequency</label>
                    <span className="text-xs font-mono text-foreground/70">{config.orderFrequency}%</span>
                </div>
                <input
                    type="range"
                    min={10}
                    max={100}
                    value={config.orderFrequency}
                    onChange={e => onConfigChange({ orderFrequency: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/40 mt-0.5">
                    <span>Low</span>
                    <span>High</span>
                </div>
            </div>

            {/* Market Events */}
            <div>
                <label className="text-xs text-muted-foreground/70 block mb-1.5">⚡ Trigger Market Event</label>
                <div className="grid grid-cols-1 gap-1.5">
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onTriggerEvent('FLASH_CRASH')}
                        className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-left"
                    >
                        <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                        Flash Crash
                        <span className="text-red-400/40 ml-auto text-[10px]">−2-5%</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onTriggerEvent('EARNINGS_SPIKE')}
                        className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-left"
                    >
                        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                        Earnings Spike
                        <span className="text-emerald-400/40 ml-auto text-[10px]">+3-7%</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onTriggerEvent('FOMC_VOLATILITY')}
                        className="flex items-center gap-2 text-xs font-bold py-2 px-3 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-left"
                    >
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        FOMC Volatility
                        <span className="text-yellow-400/40 ml-auto text-[10px]">±2%</span>
                    </motion.button>
                    <div className="grid grid-cols-2 gap-1.5">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onTriggerEvent('WHALE_BUY')}
                            className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                            Whale Buy
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onTriggerEvent('WHALE_SELL')}
                            className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                            Whale Sell
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Model Info */}
            <div className="border-t border-border/50 pt-3">
                <div className="text-[10px] text-muted-foreground/40 space-y-1">
                    <p className="font-medium text-muted-foreground/60">
                        Inspired by MarketGPT (Cornell University)
                    </p>
                    <p>
                        GPT-based order flow simulation for financial time series.
                        Original model: 100M parameters trained on NASDAQ ITCH 5.0 data.
                    </p>
                    <a
                        href="https://github.com/aaron-wheeler/MarketGPT"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400/60 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                    >
                        View Paper & Code ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
