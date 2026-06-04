import { Signal, SignalDirection } from '../signals/types';
import { SignalManager } from './signalManager';
import { fetchBinancePrice } from '../utils/binancePrices';
import { ExnessAPI } from '../signals/exnessAPI';

/**
 * Signal Catch-Up Service
 * Checks all signals against current prices when page loads
 * This handles signals that may have hit TP while browser was closed
 */
export class SignalCatchup {
    /**
     * Check all active signals and complete any that hit TP targets
     */
    static async catchupAllSignals(): Promise<void> {
        console.log('🔄 Catching up on signals...');

        const types: ('standard' | 'scalping' | 'onchain')[] = ['standard', 'scalping', 'onchain'];

        for (const type of types) {
            await this.catchupSignalsOfType(type);
        }

        console.log('✅ Signal catch-up complete');
    }

    /**
     * Catch up signals of a specific type
     */
    private static async catchupSignalsOfType(type: 'standard' | 'scalping' | 'onchain'): Promise<void> {
        const signals = SignalManager.getActiveSignals(type);
        if (signals.length === 0) return;

        console.log(`🔍 Checking ${signals.length} ${type} signals...`);

        for (const signal of signals) {
            await this.checkSignal(signal, type);
        }
    }

    /**
     * Check a single signal against current price
     */
    private static async checkSignal(signal: Signal, type: 'standard' | 'scalping' | 'onchain'): Promise<void> {
        try {
            // Fetch current price
            let currentPrice = signal.currentPrice;

            if (signal.marketType === 'CRYPTO') {
                try {
                    const realPrice = await fetchBinancePrice(signal.pair);
                    if (realPrice) {
                        currentPrice = realPrice;
                        console.log(`📊 ${signal.pair}: Current price = ${currentPrice.toFixed(8)}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not fetch ${signal.pair} price, using last known`);
                }
            } else if (signal.marketType === 'FOREX') {
                try {
                    const realPrice = await ExnessAPI.getCurrentForexPrice(signal.pair);
                    if (realPrice) {
                        currentPrice = realPrice;
                        console.log(`💱 ${signal.pair}: Current price = ${currentPrice.toFixed(5)}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not fetch ${signal.pair} price, using last known`);
                }
            }

            // Check if TP targets hit
            const isLong = signal.direction === SignalDirection.LONG || signal.direction === SignalDirection.BUY;
            let shouldComplete = false;
            let tp1Hit = signal.tp1Hit || false;
            let tp2Hit = signal.tp2Hit || false;
            let tp3Hit = signal.tp3Hit || false;

            if (isLong) {
                // LONG: Check if price went high enough
                if (signal.takeProfit3 && currentPrice >= signal.takeProfit3) {
                    tp1Hit = tp2Hit = tp3Hit = true;
                    shouldComplete = true;
                    console.log(`✅ ${signal.pair}: TP3 HIT! (${currentPrice.toFixed(8)} >= ${signal.takeProfit3.toFixed(8)})`);
                } else if (signal.takeProfit2 && currentPrice >= signal.takeProfit2) {
                    tp1Hit = tp2Hit = true;
                    shouldComplete = true;
                    console.log(`✅ ${signal.pair}: TP2 HIT! (${currentPrice.toFixed(8)} >= ${signal.takeProfit2.toFixed(8)})`);
                } else if (signal.takeProfit1 && currentPrice >= signal.takeProfit1) {
                    tp1Hit = true;
                    console.log(`✅ ${signal.pair}: TP1 HIT! (${currentPrice.toFixed(8)} >= ${signal.takeProfit1.toFixed(8)})`);
                }
            } else {
                // SHORT: Check if price went low enough
                if (signal.takeProfit3 && currentPrice <= signal.takeProfit3) {
                    tp1Hit = tp2Hit = tp3Hit = true;
                    shouldComplete = true;
                    console.log(`✅ ${signal.pair}: TP3 HIT! (${currentPrice.toFixed(8)} <= ${signal.takeProfit3.toFixed(8)})`);
                } else if (signal.takeProfit2 && currentPrice <= signal.takeProfit2) {
                    tp1Hit = tp2Hit = true;
                    shouldComplete = true;
                    console.log(`✅ ${signal.pair}: TP2 HIT! (${currentPrice.toFixed(8)} <= ${signal.takeProfit2.toFixed(8)})`);
                } else if (signal.takeProfit1 && currentPrice <= signal.takeProfit1) {
                    tp1Hit = true;
                    console.log(`✅ ${signal.pair}: TP1 HIT! (${currentPrice.toFixed(8)} <= ${signal.takeProfit1.toFixed(8)})`);
                }
            }

            // Update signal with new TP hits and current price
            const updatedSignal: Signal = {
                ...signal,
                currentPrice,
                tp1Hit,
                tp2Hit,
                tp3Hit,
                tp1HitTime: tp1Hit && !signal.tp1HitTime ? new Date() : signal.tp1HitTime,
                tp2HitTime: tp2Hit && !signal.tp2HitTime ? new Date() : signal.tp2HitTime,
                tp3HitTime: tp3Hit && !signal.tp3HitTime ? new Date() : signal.tp3HitTime,
            };

            const slHit = isLong ? currentPrice <= signal.stopLoss : currentPrice >= signal.stopLoss;

            // Complete signal if TP2 or TP3 hit, or stop if SL hit
            if (slHit) {
                SignalManager.stopSignal(signal.id, type);
                console.log(`❌ ${signal.pair}: Stop Loss HIT during catchup! (${currentPrice.toFixed(8)} <= ${signal.stopLoss.toFixed(8)})`);
            } else if (shouldComplete) {
                SignalManager.completeSignal(signal.id, type);
                console.log(`🎯 ${signal.pair}: Signal COMPLETED!`);
            } else {
                // Just update the signal
                SignalManager.updateSignal(updatedSignal, type);
            }

        } catch (error) {
            console.error(`Error checking signal ${signal.pair}:`, error);
        }
    }
}
