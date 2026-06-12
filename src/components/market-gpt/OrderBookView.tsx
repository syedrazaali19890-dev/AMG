'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PriceLevel } from '@/lib/marketgpt/orderBookEngine';

interface OrderBookViewProps {
    bids: PriceLevel[];
    asks: PriceLevel[];
    midPrice: number;
    spread: number;
    lastTradePrice: number;
    lastTradeSide: 'BID' | 'ASK';
    symbol: string;
}

export function OrderBookView({
    bids,
    asks,
    midPrice,
    spread,
    lastTradePrice,
    lastTradeSide,
    symbol,
}: OrderBookViewProps) {
    // Calculate max quantity for bar width scaling
    const maxQty = useMemo(() => {
        const allQty = [...bids, ...asks].map(l => l.quantity);
        return Math.max(1, ...allQty);
    }, [bids, asks]);

    // Format price based on symbol
    const formatPrice = (price: number) => {
        if (symbol.includes('BTC')) return price.toFixed(2);
        if (symbol.includes('ETH')) return price.toFixed(2);
        return price.toFixed(2);
    };

    // Reversed asks so lowest ask is at bottom (closest to spread)
    const reversedAsks = useMemo(() => [...asks].reverse(), [asks]);

    return (
        <div className="glass rounded-xl p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Order Book
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Spread:</span>
                    <span className="font-mono text-yellow-400">{formatPrice(spread)}</span>
                    <span className="text-muted-foreground/60">
                        ({((spread / midPrice) * 10000).toFixed(1)} bps)
                    </span>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-3 text-xs text-muted-foreground/70 font-medium mb-1 px-1">
                <span>Orders</span>
                <span className="text-center">Price</span>
                <span className="text-right">Qty</span>
            </div>

            {/* Asks (top - red, reversed so best ask at bottom) */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end min-h-0">
                <div className="space-y-px overflow-hidden">
                    {reversedAsks.slice(0, 12).map((level, i) => (
                        <div key={`ask-${i}`} className="relative grid grid-cols-3 items-center text-xs h-6 px-1 group">
                            {/* Background bar */}
                            <div
                                className="absolute right-0 top-0 bottom-0 bg-red-500/10 group-hover:bg-red-500/20 transition-colors"
                                style={{ width: `${(level.quantity / maxQty) * 100}%` }}
                            />
                            <span className="relative z-10 text-muted-foreground/50 font-mono">{level.orderCount}</span>
                            <span className="relative z-10 text-center text-red-400 font-mono font-medium">{formatPrice(level.price)}</span>
                            <span className="relative z-10 text-right text-red-400/80 font-mono">{level.quantity.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spread / Mid Price Bar */}
            <div className="my-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500/10 via-yellow-500/10 to-red-500/10 border border-yellow-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <motion.span
                            key={lastTradePrice}
                            initial={{ scale: 1.2, color: lastTradeSide === 'BID' ? '#10b981' : '#ef4444' }}
                            animate={{ scale: 1, color: '#FFD700' }}
                            transition={{ duration: 0.3 }}
                            className="text-lg font-bold font-mono"
                        >
                            {formatPrice(lastTradePrice)}
                        </motion.span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${lastTradeSide === 'BID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {lastTradeSide === 'BID' ? '▲' : '▼'}
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Mid: {formatPrice(midPrice)}</span>
                </div>
            </div>

            {/* Bids (bottom - green) */}
            <div className="flex-1 overflow-hidden min-h-0">
                <div className="space-y-px overflow-hidden">
                    {bids.slice(0, 12).map((level, i) => (
                        <div key={`bid-${i}`} className="relative grid grid-cols-3 items-center text-xs h-6 px-1 group">
                            {/* Background bar */}
                            <div
                                className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors"
                                style={{ width: `${(level.quantity / maxQty) * 100}%` }}
                            />
                            <span className="relative z-10 text-muted-foreground/50 font-mono">{level.orderCount}</span>
                            <span className="relative z-10 text-center text-emerald-400 font-mono font-medium">{formatPrice(level.price)}</span>
                            <span className="relative z-10 text-right text-emerald-400/80 font-mono">{level.quantity.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
