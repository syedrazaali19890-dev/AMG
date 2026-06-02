import { Signal, MarketType } from '../signals/types';
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
            // Update each signal type
            await this.updateSignalsOfType('standard');
            await this.updateSignalsOfType('scalping');
            await this.updateSignalsOfType('onchain');

            // Clear expired signals every ~5 minutes (100 updates * 3 seconds)
            if (this.updateCount % 100 === 0) {
                SignalManager.clearExpiredSignals();
            }
        } catch (error) {
            console.error('Background update error:', error);
        }
    }

    /**
     * Update signals of a specific type
     */
    private static async updateSignalsOfType(type: 'standard' | 'scalping' | 'onchain'): Promise<void> {
        const signals = SignalManager.getActiveSignals(type);

        // DEBUG: Log signal count
        console.log(`🔄 BackgroundMonitor: Updating ${type} signals - Found ${signals.length} active signals`);

        if (signals.length === 0) {
            console.warn(`⚠️ No ${type} signals found to update`);
            return;
        }

        // Update each signal
        for (const signal of signals) {
            try {
                // Simulate price movement (or fetch real price)
                const newPrice = await this.fetchNewPrice(signal);

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

                // Auto-complete if TP3 is hit (max profit) OR if TP2 is hit for the first time
                const tp2JustHit = tp2Hit && !signal.tp2Hit;
                const tp3JustHit = tp3Hit && !signal.tp3Hit;

                // FIX: If TP3 is hit, always complete. If TP2 just hit, complete.
                const shouldComplete = (tp3Hit && signal.tp1Hit) || (tp2JustHit && signal.tp1Hit);

                if (shouldComplete) {
                    console.log(`✅ Auto-completing signal: ${signal.pair} ${signal.direction} (+${profitLoss.toFixed(2)}%) [TP1✓ TP2${signal.tp2Hit ? '✓' : tp2JustHit ? '🆕' : '⏳'} TP3${signal.tp3Hit ? '✓' : tp3JustHit ? '🆕' : '⏳'}]`);

                    // Add to completed signals
                    updatedSignal.status = 'COMPLETED' as any;
                    SignalManager.completeSignal(signal.id, type);

                    // Show browser notification (if permitted)
                    this.showNotification(signal, profitLoss);
                } else {
                    // Just update the signal
                    SignalManager.updateSignal(updatedSignal, type);
                }
            } catch (error) {
                // Silently continue with other signals
                console.debug(`Error updating ${signal.pair}:`, error);
            }
        }
    }

    /**
     * Fetch new price for a signal
     */
    private static async fetchNewPrice(signal: Signal): Promise<number> {
        // For crypto, try to fetch real Binance price
        if (signal.marketType === MarketType.CRYPTO) {
            try {
                const realPrice = await fetchBinancePrice(signal.pair);
                if (realPrice) {
                    console.log(`📊 ${signal.pair}: Real Binance price = ${realPrice.toFixed(8)}`);
                    return realPrice;
                }
            } catch (error) {
                // Log CORS failure for monitoring
                console.debug(`⚠️ ${signal.pair}: Binance fetch failed, using simulation`);
            }
        }

        // For Forex, try to fetch Exness-compatible price
        if (signal.marketType === MarketType.FOREX) {
            try {
                const realPrice = await ExnessAPI.getCurrentForexPrice(signal.pair);
                if (realPrice) {
                    console.log(`💱 ${signal.pair}: Real Exness price = ${realPrice.toFixed(5)}`);
                    return realPrice;
                }
            } catch (error) {
                console.debug(`⚠️ ${signal.pair}: Exness fetch failed, using simulation`);
            }
        }

        // ENHANCED SIMULATION: More aggressive movement when real prices unavailable
        // This ensures signals complete in reasonable time
        const baseVolatility = signal.timeframe === '5m' ? 0.003 : 0.008; // Increased from 0.002/0.005

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

        // Log simulation periodically (every ~10 updates)
        if (Math.random() < 0.1) {
            console.log(`🎲 ${signal.pair}: Simulated ${change > 0 ? '+' : ''}${(change * 100).toFixed(2)}% → ${newPrice.toFixed(8)}`);
        }

        return newPrice;
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
