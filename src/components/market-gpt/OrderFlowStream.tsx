'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderEvent } from '@/lib/marketgpt/orderBookEngine';

interface OrderFlowStreamProps {
    events: OrderEvent[];
    symbol: string;
}

export function OrderFlowStream({ events, symbol }: OrderFlowStreamProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-scroll to bottom when new events arrive (unless hovered)
    useEffect(() => {
        if (!isHovered && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events.length, isHovered]);

    const formatPrice = (price: number) => {
        if (symbol.includes('BTC')) return price.toFixed(2);
        return price.toFixed(2);
    };

    const formatTime = (timestamp: number) => {
        const d = new Date(timestamp);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0').substring(0, 2)}`;
    };

    const getEventStyle = (event: OrderEvent) => {
        switch (event.type) {
            case 'ADD':
                return {
                    bg: 'bg-blue-500/5',
                    badge: 'bg-blue-500/20 text-blue-400',
                    label: 'ADD',
                    icon: '+',
                };
            case 'EXECUTE':
                return {
                    bg: event.side === 'BID' ? 'bg-emerald-500/5' : 'bg-red-500/5',
                    badge: event.side === 'BID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
                    label: 'EXEC',
                    icon: '⚡',
                };
            case 'CANCEL':
                return {
                    bg: 'bg-gray-500/5',
                    badge: 'bg-gray-500/20 text-gray-400',
                    label: 'CXL',
                    icon: '×',
                };
        }
    };

    return (
        <div className="glass rounded-xl p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    Order Flow
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">ADD</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">EXEC</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">CXL</span>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[60px_45px_40px_1fr_60px] text-[10px] text-muted-foreground/50 font-medium mb-1 px-1 gap-1">
                <span>Time</span>
                <span>Type</span>
                <span>Side</span>
                <span className="text-right">Price</span>
                <span className="text-right">Qty</span>
            </div>

            {/* Scrollable event list */}
            <div
                ref={scrollRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex-1 overflow-y-auto scrollbar-hide min-h-0 space-y-px"
            >
                <AnimatePresence initial={false}>
                    {events.slice(-60).map((event, i) => {
                        const style = getEventStyle(event);
                        return (
                            <motion.div
                                key={event.id + '-' + i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15 }}
                                className={`grid grid-cols-[60px_45px_40px_1fr_60px] items-center text-[11px] font-mono h-6 px-1 rounded gap-1 ${style.bg} hover:bg-white/5 transition-colors`}
                            >
                                <span className="text-muted-foreground/40">{formatTime(event.timestamp)}</span>
                                <span className={`text-[9px] font-bold text-center rounded px-1 py-0.5 ${style.badge}`}>
                                    {style.label}
                                </span>
                                <span className={`text-[10px] font-bold ${event.side === 'BID' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {event.side}
                                </span>
                                <span className={`text-right ${event.type === 'EXECUTE' ? 'text-yellow-400 font-bold' : 'text-foreground/70'}`}>
                                    {formatPrice(event.price)}
                                </span>
                                <span className="text-right text-foreground/50">{event.quantity.toLocaleString()}</span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {events.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
                        Waiting for order flow...
                    </div>
                )}
            </div>

            {/* Footer: Pause indicator */}
            {isHovered && (
                <div className="mt-2 text-center text-[10px] text-muted-foreground/50">
                    ⏸ Auto-scroll paused (hover)
                </div>
            )}
        </div>
    );
}
