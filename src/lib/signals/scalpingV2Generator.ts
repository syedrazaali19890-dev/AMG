/**
 * Scalping V2 Signal Generator
 * Uses ICT Engine to generate institutional-grade scalping signals
 * 
 * Fetches real market data from Binance for both HTF (5m) and LTF (1m)
 */

import { ICTEngine, ICTSignal, Candle } from './ictEngine';
import { BinanceAPI } from './binanceAPI';
import { MarketType, SignalType } from './types';

export interface ScalpingV2Signal extends ICTSignal {
    id: string;
    marketType: MarketType;
    signalType: SignalType;
    currentPrice: number;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'STOPPED';
    createdAt: Date;
    htfCandles?: Candle[];
    ltfCandles?: Candle[];
    /** TP level tracking */
    tp1Hit?: boolean;
    tp2Hit?: boolean;
    tp3Hit?: boolean;
    tp1HitTime?: number;  // timestamp when TP1 was hit
    tp2HitTime?: number;  // timestamp when TP2 was hit
    tp3HitTime?: number;  // timestamp when TP3 was hit
    /** Highest TP level reached: 'TP1' | 'TP2' | 'TP3' */
    highestTPHit?: 'TP1' | 'TP2' | 'TP3' | null;
}

export class ScalpingV2Generator {

    /**
     * Generate ICT scalping signals for multiple pairs
     */
    static async generateSignals(
        pairs: string[],
        marketType: MarketType = MarketType.CRYPTO,
        signalType: SignalType = SignalType.FUTURE
    ): Promise<ScalpingV2Signal[]> {
        const signals: ScalpingV2Signal[] = [];
        const isFuture = signalType === SignalType.FUTURE;

        const promises = pairs.map(async (pair) => {
            try {
                return await this.generateSingleSignal(pair, marketType, signalType, isFuture);
            } catch (err) {
                console.warn(`⚠️ V2 Signal generation failed for ${pair}:`, err);
                return null;
            }
        });

        const results = await Promise.all(promises);
        for (const res of results) {
            if (res) {
                signals.push(res);
            }
        }

        // Sort by score (highest first)
        return signals.sort((a, b) => b.score.total - a.score.total);
    }

    /**
     * Generate a single ICT signal for a pair
     */
    private static async generateSingleSignal(
        pair: string,
        marketType: MarketType,
        signalType: SignalType,
        isFuture: boolean
    ): Promise<ScalpingV2Signal | null> {
        const symbol = BinanceAPI.pairToBinanceSymbol(pair);

        // Try to fetch real current price for simulation baseline if klines call fails
        let realCurrentPrice: number | undefined;
        try {
            realCurrentPrice = await BinanceAPI.getCurrentPrice(symbol);
        } catch {
            // Ignore, will use fallback getBasePrice
        }

        // Fetch HTF data (5-minute candles, 100 candles = ~8 hours)
        let htfCandles: Candle[];
        let ltfCandles: Candle[];

        try {
            const htfKlines = await BinanceAPI.getKlines(symbol, '5m', 100, isFuture);
            htfCandles = this.klinesToCandles(htfKlines);
        } catch {
            // Fallback: generate simulated 5m data using realCurrentPrice as baseline if available
            htfCandles = this.generateSimulatedCandles(pair, 100, '5m', realCurrentPrice);
        }

        try {
            // Fetch LTF data (1-minute candles, 100 candles = ~1.5 hours)
            const ltfKlines = await BinanceAPI.getKlines(symbol, '1m', 100, isFuture);
            ltfCandles = this.klinesToCandles(ltfKlines);
        } catch {
            // Fallback: generate simulated 1m data using realCurrentPrice as baseline if available
            ltfCandles = this.generateSimulatedCandles(pair, 100, '1m', realCurrentPrice);
        }

        // Fetch real 24h open price to determine true Daily Bias
        let dailyOpenPrice: number | undefined;
        try {
            const ticker24h = await BinanceAPI.get24hTicker(symbol);
            if (ticker24h && ticker24h.openPrice) {
                dailyOpenPrice = parseFloat(ticker24h.openPrice);
            }
        } catch {
            // Ignore
        }

        if (htfCandles.length < 30 || ltfCandles.length < 30) return null;

        // Run ICT Engine
        const ictSignal = ICTEngine.generateICTSignal(htfCandles, ltfCandles, pair, dailyOpenPrice);
        if (!ictSignal) return null;

        // Validate prices
        if (!ictSignal.entry || isNaN(ictSignal.entry) || ictSignal.entry <= 0) return null;

        // Apply a small offset (0.015%) to entry to give user warning time before trigger
        const isBuy = ictSignal.type === 'BUY';
        const offset = ictSignal.entry * 0.00015; // 0.015% offset (approx $15 for BTC)
        
        const entry = isBuy ? ictSignal.entry - offset : ictSignal.entry + offset;
        const stopLoss = isBuy ? ictSignal.stopLoss - offset : ictSignal.stopLoss + offset;
        const tp1 = isBuy ? ictSignal.tp1 - offset : ictSignal.tp1 + offset;
        const tp2 = isBuy ? ictSignal.tp2 - offset : ictSignal.tp2 + offset;
        const tp3 = isBuy ? ictSignal.tp3 - offset : ictSignal.tp3 + offset;

        // Create V2 signal
        const v2Signal: ScalpingV2Signal = {
            ...ictSignal,
            id: `ICTV2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            marketType,
            signalType,
            entry,
            stopLoss,
            tp1,
            tp2,
            tp3,
            currentPrice: ltfCandles[ltfCandles.length - 1].close,
            status: 'PENDING',
            createdAt: new Date(),
            htfCandles,
            ltfCandles
        };

        return v2Signal;
    }

    /**
     * Convert Binance klines to Candle format
     */
    private static klinesToCandles(klines: number[][]): Candle[] {
        return klines.map(k => ({
            open: parseFloat(String(k[1])),
            high: parseFloat(String(k[2])),
            low: parseFloat(String(k[3])),
            close: parseFloat(String(k[4])),
            volume: parseFloat(String(k[5])),
            timestamp: Number(k[0])
        }));
    }

    /**
     * Generate simulated candle data (fallback when API is unavailable)
     */
    private static generateSimulatedCandles(
        pair: string, 
        count: number, 
        interval: string, 
        customBasePrice?: number
    ): Candle[] {
        const candles: Candle[] = [];
        let basePrice = customBasePrice || this.getBasePrice(pair);
        const now = Date.now();
        const intervalMs = interval === '1m' ? 60000 : interval === '5m' ? 300000 : 900000;

        // Add a trend bias
        const trendDirection = Math.random() > 0.5 ? 1 : -1;
        const trendStrength = 0.0002;

        for (let i = 0; i < count; i++) {
            const timestamp = now - (count - i) * intervalMs;
            const volatility = interval === '1m' ? 0.001 : interval === '5m' ? 0.002 : 0.003;

            const trend = basePrice * trendStrength * trendDirection;
            const random = (Math.random() - 0.5) * basePrice * volatility;
            const open = basePrice;
            const close = basePrice + trend + random;
            const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
            const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

            const volume = 1000 * (0.5 + Math.random() * 1.5);

            candles.push({ open, high, low, close, volume, timestamp });
            basePrice = close;
        }

        return candles;
    }

    private static getBasePrice(pair: string): number {
        const prices: Record<string, number> = {
            'BTC/USDT': 105000, 'ETH/USDT': 2700, 'BNB/USDT': 700,
            'SOL/USDT': 180, 'XRP/USDT': 2.50, 'DOGE/USDT': 0.22,
            'ADA/USDT': 0.85, 'AVAX/USDT': 30, 'DOT/USDT': 5.5,
            'LINK/USDT': 18, 'UNI/USDT': 8.5, 'NEAR/USDT': 4,
            'SUI/USDT': 3.5, 'OP/USDT': 1.5, 'ARB/USDT': 0.80,
            'MATIC/USDT': 0.5, 'ATOM/USDT': 8, 'FIL/USDT': 4,
            'INJ/USDT': 25, 'RNDR/USDT': 8, 'FET/USDT': 2,
            'TIA/USDT': 6, 'PEPE/USDT': 0.000012, 'WLD/USDT': 1.5,
        };
        return prices[pair] || 100;
    }

    /**
     * Get analysis summary for display
     */
    static getAnalysisSummary(signal: ScalpingV2Signal): string[] {
        const summary: string[] = [];

        // Daily Bias
        summary.push(`📊 Daily Bias: ${signal.dailyBias.bias} (${signal.dailyBias.confidence.toFixed(0)}% confidence)`);

        // Liquidity Sweep
        if (signal.liquiditySweep) {
            summary.push(`💧 ${signal.liquiditySweep.type === 'SELLSIDE' ? 'Sell-side' : 'Buy-side'} liquidity swept at $${signal.liquiditySweep.sweptLevel.toFixed(2)}`);
        }

        // Order Block
        if (signal.orderBlockConfirmation) {
            summary.push(`🧱 ${signal.orderBlockConfirmation.type} Order Block: $${signal.orderBlockConfirmation.low.toFixed(2)} - $${signal.orderBlockConfirmation.high.toFixed(2)}`);
        }

        // FVG
        if (signal.fvgConfirmation) {
            summary.push(`📐 ${signal.fvgConfirmation.type} FVG: $${signal.fvgConfirmation.low.toFixed(2)} - $${signal.fvgConfirmation.high.toFixed(2)}`);
        }

        // OTE
        if (signal.oteConfirmation) {
            summary.push(`🎯 OTE Zone: $${signal.oteConfirmation.fib62.toFixed(2)} - $${signal.oteConfirmation.fib79.toFixed(2)}`);
        }

        // CHoCH
        if (signal.chochConfirmation) {
            summary.push(`🔄 ${signal.chochConfirmation.type} (${signal.chochConfirmation.direction}) at $${signal.chochConfirmation.price.toFixed(2)}`);
        }

        // Premium/Discount
        summary.push(`📍 Zone: ${signal.premiumDiscount.currentZone} (EQ: $${signal.premiumDiscount.equilibrium.toFixed(2)})`);

        // Volume
        summary.push(`📈 Volume: ${signal.volumeConfirmation ? '✅ Confirmed' : '⚠️ Weak'}`);

        // Session
        summary.push(`⏰ Session: ${signal.sessionConfirmation.sessionName} (${signal.sessionConfirmation.isAllowed ? '✅ Active' : '⚠️ Avoid'})`);

        return summary;
    }
}
