import { Signal, MarketType, SignalStatus } from '../signals/types';
import { SignalManager } from './signalManager';
import { fetchBinancePrice } from '../utils/binancePrices';
import { ExnessAPI } from '../signals/exnessAPI';

/**
 * Background Monitor Service
 * Continuously monitors prices and auto-completes signals
 */

export class BackgroundMonitor {
    private static intervalId: NodeJS.Timeout | null = null;
    private static isRunning = false;
    private static updateCount = 0;

    /**
     * Start background monitoring
     */
    static start(): void {
        if (this.isRunning) {
            console.log('📊 Background monitor already running');
            return;
        }

        console.log('🚀 Starting background monitor...');

        // Run immediately first time
        this.updateAllSignals();

        // Then run every 1 second
        this.intervalId = setInterval(() => {
            this.updateAllSignals();
        }, 1000);

        this.isRunning = true;
    }

    /**
     * Stop background monitoring
     */
    static stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Background monitor stopped');
    }

    /**
     * Check if monitor is running
     */
    static get running(): boolean {
        return this.isRunning;
    }

    /**
     * Update all active signals
     */
    private static async updateAllSignals(): Promise<void> {
        this.updateCount++;

        try {
            // Fetch real crypto prices from local proxy (avoid CORS)
            const cryptoPrices = new Map<string, number>();
            try {
                const response = await fetch('/api/binance/prices');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.prices) {
                        for (const [symbol, price] of Object.entries(data.prices)) {
                            cryptoPrices.set(symbol, price as number);
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch crypto prices from proxy:', error);
            }

            // Fetch real forex prices from alternative source
            let forexPrices = new Map<string, number>();
            try {
                forexPrices = await ExnessAPI.getAllForexPrices();
            } catch (error) {
                console.warn('Failed to fetch forex prices:', error);
            }

            // Update each signal type
            await this.updateSignalsOfType('standard', cryptoPrices, forexPrices);
            await this.updateSignalsOfType('scalping', cryptoPrices, forexPrices);
            await this.updateSignalsOfType('onchain', cryptoPrices, forexPrices);

            // Clear expired signals every ~5 minutes (300 updates * 1 second)
            if (this.updateCount % 300 === 0) {
                SignalManager.clearExpiredSignals();
            }
        } catch (error) {
            console.error('Background update error:', error);
        }
    }

    /**
     * Update signals of a specific type
     */
    private static async updateSignalsOfType(
        type: 'standard' | 'scalping' | 'onchain',
        cryptoPrices: Map<string, number>,
        forexPrices: Map<string, number>
    ): Promise<void> {
        const signals = SignalManager.getActiveSignals(type);

        if (signals.length === 0) {
            return;
        }

        // Update each signal
        for (const signal of signals) {
            try {
                // Get price from mapped prices or fall back to simulation
                const binanceSymbol = signal.pair.replace('/', '');
                let newPrice = signal.currentPrice;

                if (signal.marketType === MarketType.CRYPTO) {
                    const realPrice = cryptoPrices.get(binanceSymbol);
                    if (realPrice) {
                        newPrice = realPrice;
                    } else {
                        newPrice = this.simulatePrice(signal);
                    }
                } else if (signal.marketType === MarketType.FOREX) {
                    const realPrice = forexPrices.get(binanceSymbol);
                    if (realPrice) {
                        newPrice = realPrice;
                    } else {
                        newPrice = this.simulatePrice(signal);
                    }
                }

                // Calculate RSI change based on price movement
                const priceChange = (newPrice - signal.currentPrice) / signal.currentPrice;
                const oldRsi = signal.currentRsi || signal.rsi || 50;
                let newRsi = oldRsi;

                if (priceChange > 0) {
                    newRsi = Math.min(oldRsi + Math.abs(priceChange) * 500, 100);
                } else {
                    newRsi = Math.max(oldRsi - Math.abs(priceChange) * 500, 0);
                }

                newRsi = Math.max(0, Math.min(100, newRsi + (Math.random() - 0.5) * 2));

                // Check TP/SL levels
                const isLong = signal.direction === 'LONG' || signal.direction === 'BUY';
                const slHit = isLong ? newPrice <= signal.stopLoss : newPrice >= signal.stopLoss;
                const { tp1Hit, tp2Hit, tp3Hit, profitLoss } = this.checkTPSL(signal, newPrice);

                // Update signal
                const updatedSignal: Signal = {
                    ...signal,
                    currentPrice: newPrice,
                    currentRsi: Math.round(newRsi),
                    tp1Hit: signal.tp1Hit || tp1Hit,
                    tp2Hit: signal.tp2Hit || tp2Hit,
                    tp3Hit: signal.tp3Hit || tp3Hit,
                    highestPrice: Math.max(signal.highestPrice || newPrice, newPrice),
                    lowestPrice: Math.min(signal.lowestPrice || newPrice, newPrice),
                    profitLossPercentage: profitLoss,
                    tp1HitTime: tp1Hit && !signal.tp1Hit ? new Date() : signal.tp1HitTime,
                    tp2HitTime: tp2Hit && !signal.tp2Hit ? new Date() : signal.tp2HitTime,
                    tp3HitTime: tp3Hit && !signal.tp3Hit ? new Date() : signal.tp3HitTime,
                };

                if (slHit) {
                    console.log(`❌ Stop Loss hit for: ${signal.pair} ${signal.direction} (${profitLoss.toFixed(2)}%)`);
                    SignalManager.stopSignal(signal.id, type);
                    this.showSLNotification(signal, profitLoss);
                } else {
                    // Auto-complete if TP3 is hit (max profit) OR if TP2 is hit for the first time
                    const tp2JustHit = tp2Hit && !signal.tp2Hit;
                    const shouldComplete = (tp3Hit && signal.tp1Hit) || (tp2JustHit && signal.tp1Hit);

                    if (shouldComplete) {
                        console.log(`✅ Auto-completing signal: ${signal.pair} ${signal.direction} (+${profitLoss.toFixed(2)}%)`);
                        updatedSignal.status = 'COMPLETED' as any;
                        SignalManager.completeSignal(signal.id, type);
                        this.showNotification(signal, profitLoss);
                    } else {
                        // Just update the signal
                        SignalManager.updateSignal(updatedSignal, type);
                    }
                }
            } catch (error) {
                console.debug(`Error updating ${signal.pair}:`, error);
            }
        }
    }

    /**
     * Simulate price movement for a signal (fallback when real price fails)
     */
    private static simulatePrice(signal: Signal): number {
        const baseVolatility = signal.timeframe === '5m' ? 0.003 : 0.008;

        // Add directional bias based on TP targets
        let directionBias = 0;
        const isLong = signal.direction === 'LONG' || signal.direction === 'BUY';

        // Check how far we are from TP2
        if (signal.takeProfit2) {
            const distanceToTP2 = isLong
                ? (signal.takeProfit2 - signal.currentPrice) / signal.currentPrice
                : (signal.currentPrice - signal.takeProfit2) / signal.currentPrice;

            // Add slight upward bias if we're making progress toward TP
            if (distanceToTP2 > 0 && distanceToTP2 < 0.03) { // Within 3% of TP2
                directionBias = isLong ? 0.0015 : -0.0015; // 0.15% bias toward TP
            }
        }

        const change = (Math.random() - 0.5) * baseVolatility + directionBias;
        const newPrice = signal.currentPrice * (1 + change);

        // Log simulation periodically
        if (Math.random() < 0.1) {
            console.log(`🎲 ${signal.pair}: Simulated ${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}% → ${newPrice.toFixed(8)}`);
        }

        return newPrice;
    }

    /**
     * Show browser notification for Stop Loss hits
     */
    private static showSLNotification(signal: Signal, profitLoss: number): void {
        if (typeof window === 'undefined') return;

        if (Notification.permission === 'granted') {
            try {
                new Notification('❌ Stop Loss Hit', {
                    body: `${signal.pair} ${signal.direction} - Loss: ${profitLoss.toFixed(2)}%`,
                    icon: '/favicon.ico',
                    tag: signal.id
                });
            } catch (error) {
                console.debug('Notification error:', error);
            }
        }
    }

    /**
     * Check if TP/SL levels are hit
     */
    private static checkTPSL(signal: Signal, newPrice: number): {
        tp1Hit: boolean;
        tp2Hit: boolean;
        tp3Hit: boolean;
        profitLoss: number;
    } {
        const isLong = signal.direction === 'LONG' || signal.direction === 'BUY';

        const tp1Hit = isLong
            ? newPrice >= (signal.takeProfit1 || 0)
            : newPrice <= (signal.takeProfit1 || Infinity);

        const tp2Hit = isLong
            ? newPrice >= (signal.takeProfit2 || 0)
            : newPrice <= (signal.takeProfit2 || Infinity);

        const tp3Hit = isLong
            ? newPrice >= (signal.takeProfit3 || 0)
            : newPrice <= (signal.takeProfit3 || Infinity);

        const profitLoss = isLong
            ? ((newPrice - signal.entryPrice) / signal.entryPrice) * 100
            : ((signal.entryPrice - newPrice) / signal.entryPrice) * 100;

        return { tp1Hit, tp2Hit, tp3Hit, profitLoss };
    }

    /**
     * Show browser notification
     */
    private static showNotification(signal: Signal, profitLoss: number): void {
        if (typeof window === 'undefined') return;

        // Request permission first time
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Show notification if permitted
        if (Notification.permission === 'granted') {
            try {
                new Notification('🎯 TP Hit!', {
                    body: `${signal.pair} ${signal.direction} - Profit: ${profitLoss.toFixed(2)}%`,
                    icon: '/favicon.ico',
                    tag: signal.id
                });
            } catch (error) {
                console.debug('Notification error:', error);
            }
        }
    }

    /**
     * Get monitor stats
     */
    static getStats() {
        return {
            isRunning: this.isRunning,
            updateCount: this.updateCount,
            activeSignalsCount: SignalManager.getActiveSignals().length
        };
    }
}
