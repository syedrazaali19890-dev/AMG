'use client';

import { useState } from 'react';
import { Signal, SignalDirection, SignalStatus } from '@/lib/signals/types';
import { formatPrice, formatPercentage, formatTimeAgo, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, Target, Shield, DollarSign, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NewsIndicator } from './NewsIndicator';
import { MarketAnalysisDisplay } from './MarketAnalysisDisplay';
import { PredictionDisplay } from './PredictionDisplay';
import { PatternDisplay } from './PatternDisplay';
import { TimeframeDisplay } from './TimeframeDisplay';
import { TradingViewWidget } from './TradingViewWidget';
import { AdvancedSignalView } from './AdvancedSignalView';

interface SignalCardProps {
    signal: Signal;
    onClick?: () => void;
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
    const [showChart, setShowChart] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    const isBuy = signal.direction === SignalDirection.BUY || signal.direction === SignalDirection.LONG;
    const isActive = signal.status === SignalStatus.ACTIVE;
    const isProfit = (signal.profitLossPercentage || 0) > 0;

    const statusColors = {
        [SignalStatus.PENDING]: 'border-amber-500/30 bg-amber-500/5',
        [SignalStatus.ACTIVE]: 'border-primary/50 bg-primary/5',
        [SignalStatus.COMPLETED]: isProfit ? 'border-success/50 bg-success/5' : 'border-muted/50 bg-muted/5',
        [SignalStatus.STOPPED]: 'border-danger/50 bg-danger/5'
    };

    const directionColors = isBuy
        ? 'bg-success/20 text-success border-success/30'
        : 'bg-danger/20 text-danger border-danger/30';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'relative overflow-hidden rounded-lg border-2 p-4 transition-all',
                'glass hover:shadow-lg hover:shadow-primary/20',
                statusColors[signal.status]
            )}
        >
            {/* Header */}
            <div className="mb-4" onClick={onClick}>
                {/* Counter-Trend Warning Banner */}
                {signal.isCounterTrend && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-3 bg-orange-500/10 border-2 border-orange-500/30 rounded-lg p-3"
                    >
                        <div className="flex items-start gap-2">
                            <span className="text-orange-500 text-lg flex-shrink-0">⚠️</span>
                            <div className="flex-1">
                                <div className="font-bold text-orange-500 text-xs mb-1">COUNTER-TREND SIGNAL</div>
                                <div className="text-[11px] text-orange-500/90">
                                    Trading against overall market trend ({signal.marketTrend}). Higher risk - use tight stops and smaller position size.
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="flex justify-between items-start mb-3 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-xl border shadow-sm', directionColors)}>
                            {isBuy ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold tracking-tight">{signal.pair}</h3>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                                    {signal.marketType}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                                    {signal.timeframe || '1h'}
                                </span>
                            </div>

                            {/* Exchange Availability Badges */}
                            {signal.availableExchanges && signal.availableExchanges.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    {signal.availableExchanges.map((exchange, idx) => {
                                        // Color coding for different exchanges
                                        const exchangeColors: Record<string, string> = {
                                            'Binance': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                            'Bybit': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                                            'OKX': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                                            'KuCoin': 'bg-green-500/10 text-green-600 border-green-500/20',
                                            'MEXC': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                            'Gate.io': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
                                            'BingX': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                                            'Bitget': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
                                            'Exness': 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                                        };

                                        // Find matching color or use default
                                        let colorClass = 'bg-muted/50 text-muted-foreground border-muted/20';
                                        for (const [key, value] of Object.entries(exchangeColors)) {
                                            if (exchange.includes(key)) {
                                                colorClass = value;
                                                break;
                                            }
                                        }

                                        return (
                                            <span
                                                key={idx}
                                                className={cn(
                                                    'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                                                    colorClass
                                                )}
                                            >
                                                {exchange}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <span className="text-primary flex items-center gap-1 font-medium">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    Live Market
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                        <div className={cn(
                            'px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm',
                            signal.status === SignalStatus.PENDING ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            isActive ? 'bg-primary/10 text-primary border border-primary/20' :
                                isProfit ? 'bg-success/10 text-success border border-success/20' :
                                    'bg-muted/50 text-muted-foreground border border-muted/20'
                        )}>
                            {signal.status}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {new Date(signal.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-muted/50 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            {signal.signalType}
                        </span>
                    </div>
                </div>

                {/* Price Card */}
                <div className="flex justify-between items-center bg-muted/30 rounded-xl p-3 border border-border/50 cursor-pointer">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 min-w-[80px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F3BA2F]"></span>
                                <span className="text-xs font-medium text-muted-foreground">
                                    {signal.marketType === 'FOREX' ? 'Exness' : 'Binance'}
                                </span>
                            </div>
                            <span className="text-sm font-bold font-mono tracking-tight">
                                {formatPrice(signal.currentPrice, 5)}
                            </span>
                        </div>

                        {signal.mexcPrice && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 min-w-[80px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2B77F9]"></span>
                                    <span className="text-xs font-bold text-blue-500">MEXC</span>
                                </div>
                                <span className="text-sm font-bold font-mono tracking-tight text-blue-500">
                                    {formatPrice(signal.mexcPrice, 5)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        'text-xl font-black px-6 py-2 rounded-lg border-2 shadow-sm whitespace-nowrap tracking-wide',
                        isBuy ? 'text-success border-success/20 bg-success/5' : 'text-danger border-danger/20 bg-danger/5'
                    )}>
                        {signal.direction}
                    </div>
                </div>
            </div>

            {/* Confidence Score */}
            <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-bold text-primary">{signal.confidence}%</span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${signal.confidence}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={cn(
                            'h-full rounded-full',
                            signal.confidence >= 80 ? 'bg-success' :
                                signal.confidence >= 60 ? 'bg-primary' : 'bg-danger'
                        )}
                    />
                </div>
            </div>

            {/* RSI Indicator - Entry vs Current */}
            {signal.rsi !== undefined && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">RSI (Relative Strength)</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                                Entry: <span className={cn(
                                    "font-semibold",
                                    signal.rsi < 30 ? 'text-green-500/70' :
                                        signal.rsi > 70 ? 'text-red-500/70' : 'text-blue-500/70'
                                )}>{Math.round(signal.rsi)}</span>
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-[10px] text-muted-foreground">
                                Current: <span className={cn(
                                    "font-bold text-sm",
                                    (signal.currentRsi || signal.rsi) < 30 ? 'text-green-500' :
                                        (signal.currentRsi || signal.rsi) > 70 ? 'text-red-500' : 'text-blue-500'
                                )}>{Math.round(signal.currentRsi || signal.rsi)}</span>
                            </span>
                        </div>
                    </div>
                    <div className="relative h-3 bg-gradient-to-r from-green-500 via-blue-500 to-red-500 rounded-full overflow-hidden opacity-30">
                        {/* Zone markers */}
                        <div className="absolute left-[30%] top-0 bottom-0 w-px bg-white/50" />
                        <div className="absolute left-[70%] top-0 bottom-0 w-px bg-white/50" />
                    </div>
                    <div className="relative h-3 -mt-3">
                        <motion.div
                            initial={{ left: `${signal.rsi}%` }}
                            animate={{ left: `${signal.currentRsi || signal.rsi}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="absolute top-0 bottom-0 -ml-1"
                        >
                            <div className={cn(
                                "w-2 h-full rounded-full border-2 border-white shadow-lg",
                                (signal.currentRsi || signal.rsi) < 30 ? 'bg-green-500' :
                                    (signal.currentRsi || signal.rsi) > 70 ? 'bg-red-500' : 'bg-blue-500'
                            )} />
                        </motion.div>
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>Oversold</span>
                        <span>Neutral</span>
                        <span>Overbought</span>
                    </div>
                </div>
            )}
            {/* Price Information & Entry Zone */}
            <div className="mb-3">
                {signal.entryZoneLow && signal.entryZoneHigh ? (
                    <div className="glass-dark rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Entry Zone
                            </div>
                            <div className="text-xs font-bold font-mono text-primary/90">
                                {formatPrice(Math.min(signal.entryZoneLow, signal.entryZoneHigh), 5)} - {formatPrice(Math.max(signal.entryZoneLow, signal.entryZoneHigh), 5)}
                            </div>
                        </div>
                        
                        {/* Suggested Limit Order */}
                        {signal.suggestedLimitEntry && (
                            <div className="mt-2 pt-2 border-t border-border/50 flex items-start gap-2 bg-primary/5 -mx-3 -mb-3 p-3 rounded-b-lg">
                                <div className="text-primary mt-0.5">💡</div>
                                <div>
                                    <div className="text-xs font-bold text-primary tracking-wide">
                                        Limit Order @ {formatPrice(signal.suggestedLimitEntry, 5)}
                                    </div>
                                    <div className="text-[10px] text-primary/70 mt-0.5">
                                        Recommended entry for better risk/reward
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="glass-dark rounded-lg p-2">
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Entry Price
                            </div>
                            <div className="font-bold">{formatPrice(signal.entryPrice, 5)}</div>
                        </div>
                        <div className="glass-dark rounded-lg p-2">
                            <div className="text-xs text-muted-foreground mb-1">Current Price</div>
                            <div className="font-bold">{formatPrice(signal.currentPrice, 5)}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Highest/Lowest Price Tracking */}
            {(signal.highestPrice || signal.lowestPrice) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {signal.highestPrice && (
                        <div className="glass-dark rounded-lg p-2 border border-success/20">
                            <div className="text-xs text-success mb-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Highest Reached
                            </div>
                            <div className="font-bold text-sm">{formatPrice(signal.highestPrice, 5)}</div>
                        </div>
                    )}
                    {signal.lowestPrice && (
                        <div className="glass-dark rounded-lg p-2 border border-danger/20">
                            <div className="text-xs text-danger mb-1 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Lowest Reached
                            </div>
                            <div className="font-bold text-sm">{formatPrice(signal.lowestPrice, 5)}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Partial Take Profits */}
            {signal.takeProfit1 && signal.takeProfit2 && signal.takeProfit3 ? (
                <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Take Profit Levels</div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className={cn(
                            "glass-dark rounded-lg p-2 border transition-all",
                            signal.tp1Hit ? "border-success bg-success/10" : "border-border/50"
                        )}>
                            <div className="text-xs text-success mb-1 flex items-center justify-between">
                                <span>TP1 (30%)</span>
                                {signal.tp1Hit && <span className="text-success">✓</span>}
                            </div>
                            <div className="font-bold text-xs">{formatPrice(signal.takeProfit1, 5)}</div>
                            {signal.tp1Hit && signal.tp1HitTime && (
                                <div className="text-[10px] text-success/70 mt-1">
                                    Hit: {new Date(signal.tp1HitTime).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            )}
                        </div>
                        <div className={cn(
                            "glass-dark rounded-lg p-2 border transition-all",
                            signal.tp2Hit ? "border-success bg-success/10" : "border-border/50"
                        )}>
                            <div className="text-xs text-success mb-1 flex items-center justify-between">
                                <span>TP2 (60%)</span>
                                {signal.tp2Hit && <span className="text-success">✓</span>}
                            </div>
                            <div className="font-bold text-xs">{formatPrice(signal.takeProfit2, 5)}</div>
                            {signal.tp2Hit && signal.tp2HitTime && (
                                <div className="text-[10px] text-success/70 mt-1">
                                    Hit: {new Date(signal.tp2HitTime).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            )}
                        </div>
                        <div className={cn(
                            "glass-dark rounded-lg p-2 border transition-all",
                            signal.tp3Hit ? "border-success bg-success/10" : "border-border/50"
                        )}>
                            <div className="text-xs text-success mb-1 flex items-center justify-between">
                                <span>TP3 (100%)</span>
                                {signal.tp3Hit && <span className="text-success">✓</span>}
                            </div>
                            <div className="font-bold text-xs">{formatPrice(signal.takeProfit3, 5)}</div>
                            {signal.tp3Hit && signal.tp3HitTime && (
                                <div className="text-[10px] text-success/70 mt-1">
                                    Hit: {new Date(signal.tp3HitTime).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="glass-dark rounded-lg p-2 border border-danger/30">
                        <div className="text-xs text-danger mb-1 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Stop Loss
                        </div>
                        <div className="font-bold text-sm">{formatPrice(signal.stopLoss, 5)}</div>
                    </div>
                </div>
            ) : (
                // Fallback for old signals without partial TPs
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="glass-dark rounded-lg p-2">
                        <div className="text-xs text-success mb-1 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Take Profit
                        </div>
                        <div className="font-bold text-sm">{formatPrice(signal.takeProfit, 5)}</div>
                    </div>
                    <div className="glass-dark rounded-lg p-2">
                        <div className="text-xs text-danger mb-1 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Stop Loss
                        </div>
                        <div className="font-bold text-sm">{formatPrice(signal.stopLoss, 5)}</div>
                    </div>
                </div>
            )}

            {/* P/L Display */}
            {signal.profitLossPercentage !== undefined && (
                <div className={cn(
                    'rounded-lg p-2 text-center font-bold mb-3',
                    isProfit ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                )}>
                    {formatPercentage(signal.profitLossPercentage)}
                </div>
            )}

            {/* Advanced Market Analysis */}
            <MarketAnalysisDisplay signal={signal} />

            {/* Predictive AI Displays */}
            <PredictionDisplay
                nextCandlePrediction={signal.nextCandlePrediction}
                predictionConsensus={signal.predictionConsensus}
            />
            <PatternDisplay patterns={signal.detectedPatterns} />
            <TimeframeDisplay alignment={signal.timeframeAlignment} />

            {/* News and Economic Events */}
            <NewsIndicator signal={signal} />

            {/* TradingView Chart Expansion */}
            <AnimatePresence>
                {showChart && !showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border/30 overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold">Interactive Chart</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{signal.pair}</span>
                        </div>
                        <TradingViewWidget 
                            symbol={signal.pair} 
                            height={350} 
                            isFuture={signal.signalType === 'FUTURE'} 
                        />
                    </motion.div>
                )}
                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border/30 overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-primary">Advanced Analysis</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{signal.pair}</span>
                        </div>
                        <AdvancedSignalView signal={signal} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer Time & Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowChart(!showChart);
                            if (!showChart) setShowAdvanced(false);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                            showChart 
                                ? "bg-primary/20 text-primary border-primary/30" 
                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-border/50 hover:text-foreground"
                        )}
                    >
                        <BarChart2 className="w-3.5 h-3.5" />
                        {showChart ? "Hide Chart" : "Basic Chart"}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAdvanced(!showAdvanced);
                            if (!showAdvanced) setShowChart(false);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                            showAdvanced 
                                ? "bg-primary/20 text-primary border-primary/30" 
                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border-border/50 hover:text-foreground"
                        )}
                    >
                        <Target className="w-3.5 h-3.5" />
                        {showAdvanced ? "Hide Advanced" : "Advanced"}
                    </button>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(signal.timestamp)}
                </div>
            </div>
        </motion.div>
    );
}
