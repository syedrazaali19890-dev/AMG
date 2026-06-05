'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, Time, CandlestickSeries } from 'lightweight-charts';
import { ScalpingV2Signal } from '@/lib/signals/scalpingV2Generator';
import { Activity, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';

interface ScalpingV2ChartProps {
    signal: ScalpingV2Signal;
}

function getPrecision(price: number): number {
    if (price >= 1000) return 2;
    if (price >= 1) return 4;
    if (price >= 0.01) return 6;
    return 8;
}

function formatPrice(price: number): string {
    if (!price || isNaN(price)) return '0.0000';
    return price.toFixed(getPrecision(price));
}

export function ScalpingV2Chart({ signal }: { signal: ScalpingV2Signal }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'1m' | '5m'>('1m');

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        // Create chart with premium dark theme configuration
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#07070c' },
                textColor: '#9CA3AF',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(255, 255, 255, 0.05)',
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                scaleMargins: {
                    top: 0.15,
                    bottom: 0.15,
                },
            },
            crosshair: {
                vertLine: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 1,
                    style: LineStyle.Dashed,
                },
                horzLine: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 1,
                    style: LineStyle.Dashed,
                },
            },
        });

        chartRef.current = chart;

        const precision = getPrecision(signal.entry);
        const minMove = 1 / Math.pow(10, precision);

        // Customize candlestick styling
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
            priceFormat: {
                type: 'price',
                precision: precision,
                minMove: minMove,
            },
        });

        seriesRef.current = candlestickSeries;

        // Map initial candles based on selected timeframe
        const candles = timeframe === '1m' ? signal.ltfCandles : signal.htfCandles;
        if (candles && candles.length > 0) {
            const chartData = [...candles]
                .sort((a, b) => a.timestamp - b.timestamp)
                .map(c => ({
                    time: Math.floor(c.timestamp / 1000) as Time,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                }));

            candlestickSeries.setData(chartData);
        }

        // Add Target Lines
        // ─── Entry Price (Blue) ─────────────────────────
        candlestickSeries.createPriceLine({
            price: signal.entry,
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'ENTRY',
        });

        // ─── Stop Loss (Red) ────────────────────────────
        candlestickSeries.createPriceLine({
            price: signal.stopLoss,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'SL',
        });

        // ─── Take Profit 1 (Green) ──────────────────────
        if (signal.tp1) {
            candlestickSeries.createPriceLine({
                price: signal.tp1,
                color: '#10b981',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'TP1 (1:3)',
            });
        }

        // ─── Take Profit 2 (Emerald) ────────────────────
        if (signal.tp2) {
            candlestickSeries.createPriceLine({
                price: signal.tp2,
                color: '#10b981',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'TP2 (1:5)',
            });
        }

        // ─── Take Profit 3 / Liquidity target (Purple) ──
        if (signal.tp3) {
            candlestickSeries.createPriceLine({
                price: signal.tp3,
                color: '#a855f7',
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP3 (LIQ)',
            });
        }

        chart.timeScale().fitContent();
        setLoading(false);

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [signal.id, timeframe]);

    // Handle live price action updates of candles on ticker/candles changes
    useEffect(() => {
        if (!seriesRef.current) return;

        const candles = timeframe === '1m' ? signal.ltfCandles : signal.htfCandles;
        if (!candles || candles.length === 0) return;

        const lastCandle = candles[candles.length - 1];
        
        seriesRef.current.update({
            time: Math.floor(lastCandle.timestamp / 1000) as Time,
            open: lastCandle.open,
            high: lastCandle.high,
            low: lastCandle.low,
            close: lastCandle.close
        });
    }, [signal.currentPrice, signal.ltfCandles, signal.htfCandles, timeframe]);

    // Calculate percentage distance from entry to current price
    const percentFromEntry = ((signal.currentPrice - signal.entry) / signal.entry) * 100;
    const isGain = signal.type === 'BUY' ? percentFromEntry >= 0 : percentFromEntry <= 0;

    return (
        <div className="relative w-full rounded-2xl overflow-hidden border border-white/5 bg-[#07070c] p-4 space-y-3">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-muted-foreground font-mono">
                        <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        LIVE PRICE ACTION
                    </div>

                    {/* Timeframe Switcher */}
                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                        <button
                            onClick={() => setTimeframe('1m')}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                timeframe === '1m'
                                    ? 'bg-gradient-to-r from-purple-500/80 to-cyan-500/80 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            1m (Entry Frame)
                        </button>
                        <button
                            onClick={() => setTimeframe('5m')}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                timeframe === '5m'
                                    ? 'bg-gradient-to-r from-purple-500/80 to-cyan-500/80 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-white'
                            }`}
                        >
                            5m (Trend Setup)
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Live Price Tag */}
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Price</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-sm font-bold text-white">
                                ${formatPrice(signal.currentPrice)}
                            </span>
                            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                                isGain ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                                {isGain ? '+' : ''}{percentFromEntry.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                        {signal.status === 'ACTIVE' && (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                                ACTIVE
                            </div>
                        )}
                        {signal.status === 'COMPLETED' && (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                TP HIT / DONE
                            </div>
                        )}
                        {signal.status === 'STOPPED' && (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400">
                                <ShieldAlert className="w-3 h-3" />
                                STOP LOSS HIT
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="relative w-full rounded-xl overflow-hidden border border-white/5">
                {loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#07070c]/90 backdrop-blur-sm">
                        <div className="text-muted-foreground animate-pulse text-sm font-medium">Initializing live candlestick chart...</div>
                    </div>
                )}
                <div ref={chartContainerRef} className="w-full" />
            </div>

            {/* Legend / Info bar */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-white/5">
                <div className="flex flex-wrap gap-4 items-center">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        Entry Level: <strong className="text-white font-mono">${formatPrice(signal.entry)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Stop Loss: <strong className="text-white font-mono">${formatPrice(signal.stopLoss)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Targets: <strong className="text-white font-mono">${formatPrice(signal.tp1)}</strong> / <strong className="text-white font-mono">${formatPrice(signal.tp2)}</strong>
                    </span>
                    {signal.tp3 && (
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                            TP3 (Liq): <strong className="text-white font-mono">${formatPrice(signal.tp3)}</strong>
                        </span>
                    )}
                </div>
                <div>
                    Ratio 1:{signal.riskRewardRatio} R:R • 5m Daily Bias: <span className={signal.dailyBias.bias === 'BULLISH' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{signal.dailyBias.bias}</span>
                </div>
            </div>
        </div>
    );
}
