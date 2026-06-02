'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineStyle, Time, CandlestickSeries } from 'lightweight-charts';
import { Signal, SignalDirection } from '@/lib/signals/types';
import { MarketDataManager } from '@/lib/signals/marketData';

export function AdvancedSignalChart({ signal }: { signal: Signal }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const [loading, setLoading] = useState(true);
    const lastDataRef = useRef<{ time: Time, open: number, high: number, low: number, close: number } | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9CA3AF',
            },
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: 'rgba(42, 46, 57, 0.5)',
            },
        });
        
        chartRef.current = chart;

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
            priceFormat: {
                type: 'price',
                precision: 5,
                minMove: 0.00001,
            },
        });
        
        seriesRef.current = candlestickSeries;

        const loadData = async () => {
            try {
                // Fetch market data
                const marketData = await MarketDataManager.generateMarketData(signal.pair, signal.marketType, 100);
                
                // Sort data by time to ensure it is in ascending order
                const sortedIndices = marketData.timestamps
                    .map((t, i) => i)
                    .sort((a, b) => marketData.timestamps[a].getTime() - marketData.timestamps[b].getTime());

                // lightweight-charts requires strictly ascending time values
                let lastTimeVal = 0;
                let prevPrice = marketData.prices[sortedIndices[0]] * 0.999;
                
                const data = sortedIndices.map(index => {
                    let t = Math.floor(marketData.timestamps[index].getTime() / 1000);
                    if (t <= lastTimeVal) {
                        t = lastTimeVal + 60; // ensure strict ascending
                    }
                    lastTimeVal = t;
                    
                    const price = marketData.prices[index];
                    const volatility = price * 0.001;
                    
                    const open = prevPrice;
                    const close = price;
                    const high = Math.max(open, close) + (Math.random() * volatility);
                    const low = Math.min(open, close) - (Math.random() * volatility);
                    
                    prevPrice = close;

                    return {
                        time: t as Time,
                        open,
                        high,
                        low,
                        close
                    };
                });

                candlestickSeries.setData(data);
                
                // Save the last candle for live updates
                if (data.length > 0) {
                    lastDataRef.current = data[data.length - 1];
                }

                // Add Entry Line
                candlestickSeries.createPriceLine({
                    price: signal.entryPrice,
                    color: '#3b82f6', // blue
                    lineWidth: 2,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    title: 'Entry',
                });

                // Add Stop Loss
                candlestickSeries.createPriceLine({
                    price: signal.stopLoss,
                    color: '#ef4444', // red
                    lineWidth: 2,
                    lineStyle: LineStyle.Dashed,
                    axisLabelVisible: true,
                    title: 'SL',
                });

                // Add Take Profits
                if (signal.takeProfit1) {
                    candlestickSeries.createPriceLine({ price: signal.takeProfit1, color: '#10b981', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'TP1' });
                }
                if (signal.takeProfit2) {
                    candlestickSeries.createPriceLine({ price: signal.takeProfit2, color: '#10b981', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'TP2' });
                }
                if (signal.takeProfit3) {
                    candlestickSeries.createPriceLine({ price: signal.takeProfit3, color: '#10b981', lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'TP3' });
                } else if (signal.takeProfit) {
                    candlestickSeries.createPriceLine({ price: signal.takeProfit, color: '#10b981', lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'TP' });
                }

                chart.timeScale().fitContent();
            } catch (err) {
                console.error("Failed to load chart data", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signal.id]);

    // Handle live price updates on the last candle
    useEffect(() => {
        if (!seriesRef.current || !lastDataRef.current) return;
        
        const currentData = lastDataRef.current;
        const newClose = signal.currentPrice;
        
        const updatedData = {
            ...currentData,
            high: Math.max(currentData.high, newClose),
            low: Math.min(currentData.low, newClose),
            close: newClose
        };
        
        seriesRef.current.update(updatedData);
        lastDataRef.current = updatedData;
    }, [signal.currentPrice]);

    return (
        <div className="relative w-full rounded-lg overflow-hidden border border-border/50 bg-background/50">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="text-muted-foreground animate-pulse text-sm font-medium">Loading analysis chart...</div>
                </div>
            )}
            <div ref={chartContainerRef} className="w-full" />
        </div>
    );
}
