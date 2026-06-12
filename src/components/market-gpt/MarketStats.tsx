'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketStatsData } from '@/lib/marketgpt/orderBookEngine';
import {
    LineChart,
    Line,
    ResponsiveContainer,
} from 'recharts';

interface MarketStatsProps {
    stats: MarketStatsData;
    symbol: string;
}

function AnimatedNumber({ value, decimals = 2, prefix = '' }: { value: number; decimals?: number; prefix?: string }) {
    return (
        <motion.span
            key={value.toFixed(decimals)}
            initial={{ opacity: 0.5, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="font-mono"
        >
            {prefix}{value.toFixed(decimals)}
        </motion.span>
    );
}

function MiniSparkline({ data }: { data: number[] }) {
    const chartData = useMemo(() => {
        const recent = data.slice(-50);
        return recent.map((v, i) => ({ idx: i, value: v }));
    }, [data]);

    if (chartData.length < 3) return null;

    // Determine color based on trend
    const first = chartData[0]?.value ?? 0;
    const last = chartData[chartData.length - 1]?.value ?? 0;
    const color = last >= first ? '#10b981' : '#ef4444';

    return (
        <div className="h-8 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function MarketStats({ stats, symbol }: MarketStatsProps) {
    const formatPrice = (price: number) => {
        if (symbol.includes('BTC')) return price.toFixed(2);
        return price.toFixed(2);
    };

    const priceChange = stats.priceHistory.length >= 2
        ? stats.priceHistory[stats.priceHistory.length - 1] - stats.priceHistory[0]
        : 0;
    const priceChangePct = stats.priceHistory.length >= 2 && stats.priceHistory[0] > 0
        ? (priceChange / stats.priceHistory[0]) * 100
        : 0;

    return (
        <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    Market Stats
                </h3>
                <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold font-mono text-foreground">
                        {symbol}
                    </span>
                </div>
            </div>

            {/* Main Price Display */}
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                        ${formatPrice(stats.midPrice)}
                    </div>
                    <div className={`text-xs font-mono ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} ({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(3)}%)
                    </div>
                </div>
                <div className="w-24">
                    <MiniSparkline data={stats.priceHistory} />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                <StatItem
                    label="Spread"
                    value={<><AnimatedNumber value={stats.spread} decimals={4} prefix="$" /> <span className="text-muted-foreground/40 text-[9px]">({stats.spreadBps.toFixed(1)} bps)</span></>}
                />
                <StatItem
                    label="VWAP"
                    value={<AnimatedNumber value={stats.vwap} prefix="$" />}
                />
                <StatItem
                    label="Volume"
                    value={<span className="font-mono">{stats.totalVolume.toLocaleString()}</span>}
                />
                <StatItem
                    label="Orders/sec"
                    value={<AnimatedNumber value={stats.ordersPerSecond} decimals={1} />}
                />
                <StatItem
                    label="High"
                    value={<span className="font-mono text-emerald-400/80">${formatPrice(stats.highPrice)}</span>}
                />
                <StatItem
                    label="Low"
                    value={<span className="font-mono text-red-400/80">${formatPrice(stats.lowPrice)}</span>}
                />
                <StatItem
                    label="Bid/Ask Ratio"
                    value={
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 flex-1 bg-muted/30 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 rounded-l-full"
                                    style={{ width: `${Math.min(100, (stats.bidAskRatio / (stats.bidAskRatio + 1)) * 100)}%` }}
                                />
                                <div
                                    className="h-full bg-red-500 rounded-r-full flex-1"
                                />
                            </div>
                            <span className="font-mono text-[10px]">{stats.bidAskRatio.toFixed(2)}</span>
                        </div>
                    }
                    fullWidth
                />
                <StatItem
                    label="Realized Vol"
                    value={<AnimatedNumber value={stats.volatility} decimals={4} />}
                    suffix="%"
                />
            </div>
        </div>
    );
}

function StatItem({
    label,
    value,
    suffix,
    fullWidth = false,
}: {
    label: string;
    value: React.ReactNode;
    suffix?: string;
    fullWidth?: boolean;
}) {
    return (
        <div className={`bg-muted/10 rounded-lg px-2.5 py-1.5 ${fullWidth ? 'col-span-2' : ''}`}>
            <div className="text-[10px] text-muted-foreground/50 mb-0.5">{label}</div>
            <div className="text-xs text-foreground/80 flex items-center gap-0.5">
                {value}
                {suffix && <span className="text-muted-foreground/40 text-[10px]">{suffix}</span>}
            </div>
        </div>
    );
}
