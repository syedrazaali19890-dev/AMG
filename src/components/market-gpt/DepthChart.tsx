'use client';

import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { PriceLevel } from '@/lib/marketgpt/orderBookEngine';

interface DepthChartProps {
    bids: PriceLevel[];
    asks: PriceLevel[];
    midPrice: number;
}

interface DepthDataPoint {
    price: number;
    bidVolume: number | null;
    askVolume: number | null;
}

export function DepthChart({ bids, asks, midPrice }: DepthChartProps) {
    const data = useMemo(() => {
        const points: DepthDataPoint[] = [];

        // Bids: cumulative from best bid outward (descending price)
        // We want to display left to right by price, so reverse the order
        const sortedBids = [...bids].sort((a, b) => a.price - b.price); // ascending for chart
        let bidCumulative = bids.reduce((sum, b) => sum + b.quantity, 0); // Start with total

        for (const level of sortedBids) {
            points.push({
                price: level.price,
                bidVolume: bidCumulative,
                askVolume: null,
            });
            bidCumulative -= level.quantity;
        }

        // Add midpoint
        points.push({
            price: midPrice,
            bidVolume: null,
            askVolume: null,
        });

        // Asks: cumulative from best ask outward (ascending price)
        let askCumulative = 0;
        const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

        for (const level of sortedAsks) {
            askCumulative += level.quantity;
            points.push({
                price: level.price,
                bidVolume: null,
                askVolume: askCumulative,
            });
        }

        return points;
    }, [bids, asks, midPrice]);

    // Format price for tooltip
    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toFixed(2);
        return price.toFixed(2);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || payload.length === 0) return null;
        const data = payload[0]?.payload;
        if (!data) return null;

        return (
            <div className="glass rounded-lg p-3 border border-border text-xs">
                <div className="text-muted-foreground mb-1">Price: <span className="text-foreground font-mono">${formatPrice(data.price)}</span></div>
                {data.bidVolume !== null && (
                    <div className="text-emerald-400">Bid Volume: <span className="font-mono">{data.bidVolume.toLocaleString()}</span></div>
                )}
                {data.askVolume !== null && (
                    <div className="text-red-400">Ask Volume: <span className="font-mono">{data.askVolume.toLocaleString()}</span></div>
                )}
            </div>
        );
    };

    return (
        <div className="glass rounded-xl p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Market Depth
            </h3>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="askGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="price"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(v) => formatPrice(v)}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                            x={midPrice}
                            stroke="#FFD700"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                            opacity={0.5}
                        />
                        <Area
                            type="stepAfter"
                            dataKey="bidVolume"
                            stroke="#10b981"
                            strokeWidth={2}
                            fill="url(#bidGradient)"
                            connectNulls={false}
                            dot={false}
                            activeDot={{ r: 4, fill: '#10b981' }}
                        />
                        <Area
                            type="stepAfter"
                            dataKey="askVolume"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#askGradient)"
                            connectNulls={false}
                            dot={false}
                            activeDot={{ r: 4, fill: '#ef4444' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
