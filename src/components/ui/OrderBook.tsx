'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderBookProps {
    symbol: string;
    currentPrice: number;
}

interface OrderBookEntry {
    price: number;
    amount: number;
    total: number;
    type: 'bid' | 'ask';
    depthPercent: number; // For the background bar
}

export function OrderBook({ symbol, currentPrice }: OrderBookProps) {
    const [bids, setBids] = useState<OrderBookEntry[]>([]);
    const [asks, setAsks] = useState<OrderBookEntry[]>([]);

    useEffect(() => {
        // Simulate order book generation based on current price
        const generateOrderBook = () => {
            const newBids: OrderBookEntry[] = [];
            const newAsks: OrderBookEntry[] = [];
            
            let totalBidVolume = 0;
            let totalAskVolume = 0;

            const baseAmount = currentPrice > 1000 ? Math.random() * 2 : Math.random() * 1000;
            const spread = currentPrice * 0.0001; // 0.01% spread

            // Generate Bids (Lower than current price)
            let bidPrice = currentPrice - spread;
            for (let i = 0; i < 15; i++) {
                const amount = baseAmount * (0.5 + Math.random() * 2);
                totalBidVolume += amount;
                newBids.push({
                    price: bidPrice,
                    amount: amount,
                    total: totalBidVolume,
                    type: 'bid',
                    depthPercent: 0 // Calculated later
                });
                bidPrice -= bidPrice * (0.0005 + Math.random() * 0.001);
            }

            // Generate Asks (Higher than current price)
            let askPrice = currentPrice + spread;
            for (let i = 0; i < 15; i++) {
                const amount = baseAmount * (0.5 + Math.random() * 2);
                totalAskVolume += amount;
                newAsks.push({
                    price: askPrice,
                    amount: amount,
                    total: totalAskVolume,
                    type: 'ask',
                    depthPercent: 0
                });
                askPrice += askPrice * (0.0005 + Math.random() * 0.001);
            }

            // Asks should be ordered descending so the lowest ask is at the bottom (closest to price)
            newAsks.reverse();

            // Calculate depth percentage for the visual bars
            const maxBidTotal = totalBidVolume;
            const maxAskTotal = totalAskVolume;
            const overallMax = Math.max(maxBidTotal, maxAskTotal);

            newBids.forEach(b => b.depthPercent = (b.total / overallMax) * 100);
            newAsks.forEach(a => {
                // Since asks are reversed, total is calculated differently if we want cumulative from middle out.
                // Recompute cumulative total from middle out for asks
            });
            
            // Recalculate asks cumulative total properly (bottom to top)
            let currentAskTotal = 0;
            for (let i = newAsks.length - 1; i >= 0; i--) {
                currentAskTotal += newAsks[i].amount;
                newAsks[i].total = currentAskTotal;
                newAsks[i].depthPercent = (currentAskTotal / overallMax) * 100;
            }

            setBids(newBids);
            setAsks(newAsks);
        };

        generateOrderBook();

        // Update every 2 seconds to simulate live depth changes
        const interval = setInterval(generateOrderBook, 2000);
        return () => clearInterval(interval);
    }, [currentPrice]);

    return (
        <div className="flex flex-col h-full bg-background/50 rounded-lg border border-border/50 overflow-hidden font-mono text-[11px] sm:text-xs">
            <div className="flex justify-between items-center p-2 border-b border-border/50 bg-muted/20">
                <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Order Book</span>
                <span className="text-[10px] text-muted-foreground">{symbol}</span>
            </div>

            <div className="flex justify-between px-3 py-1.5 text-muted-foreground/70 border-b border-border/30">
                <div className="w-1/3 text-left">Price</div>
                <div className="w-1/3 text-right">Amount</div>
                <div className="w-1/3 text-right">Total</div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col relative min-h-[300px]">
                {/* Asks (Sell Orders) */}
                <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col justify-end">
                    {asks.map((ask, i) => (
                        <div key={`ask-${i}`} className="relative flex justify-between px-3 py-[2px] group hover:bg-muted/30 cursor-pointer">
                            <div 
                                className="absolute top-0 right-0 bottom-0 bg-danger/10 z-0 transition-all duration-300" 
                                style={{ width: `${ask.depthPercent}%` }} 
                            />
                            <div className="w-1/3 text-left text-danger z-10">{formatPrice(ask.price, 5)}</div>
                            <div className="w-1/3 text-right z-10">{ask.amount.toFixed(4)}</div>
                            <div className="w-1/3 text-right text-muted-foreground z-10">{ask.total.toFixed(4)}</div>
                        </div>
                    ))}
                </div>

                {/* Current Price Divider */}
                <div className="py-2 px-3 border-y border-border/30 bg-muted/10 flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: currentPrice > (bids[0]?.price || 0) ? '#10b981' : '#ef4444' }}>
                        {formatPrice(currentPrice, 5)}
                    </span>
                    <span className="text-muted-foreground text-[10px]">Mark</span>
                </div>

                {/* Bids (Buy Orders) */}
                <div className="flex-1 overflow-y-auto hide-scrollbar">
                    {bids.map((bid, i) => (
                        <div key={`bid-${i}`} className="relative flex justify-between px-3 py-[2px] group hover:bg-muted/30 cursor-pointer">
                            <div 
                                className="absolute top-0 right-0 bottom-0 bg-success/10 z-0 transition-all duration-300" 
                                style={{ width: `${bid.depthPercent}%` }} 
                            />
                            <div className="w-1/3 text-left text-success z-10">{formatPrice(bid.price, 5)}</div>
                            <div className="w-1/3 text-right z-10">{bid.amount.toFixed(4)}</div>
                            <div className="w-1/3 text-right text-muted-foreground z-10">{bid.total.toFixed(4)}</div>
                        </div>
                    ))}
                </div>
            </div>
            
            <style jsx>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
