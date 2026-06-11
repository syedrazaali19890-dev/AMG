/**
 * Gold Signal Generator
 * Uses ICT Engine (same as Scalping V2) to generate institutional-grade Gold (XAU/USD) signals
 * 
 * Fetches Gold market data from ExnessAPI for both HTF (5m) and LTF (1m)
 * Applies the same ICT / Smart Money Concepts system:
 *   BOS, CHoCH, Liquidity Sweeps, FVG, Order Blocks, OTE, Premium/Discount, Session Filter
 */

import { ICTEngine, ICTSignal, Candle } from './ictEngine';
import { ExnessAPI, ForexCandle } from './exnessAPI';
import { MarketType, SignalType } from './types';

export interface GoldSignal extends ICTSignal {
    id: string;
    marketType: MarketType;
    signalType: SignalType;
    currentPrice: number;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'STOPPED';
    createdAt: Date;
    htfCandles?: Candle[];
    ltfCandles?: Candle[];
    /** Gold-specific: lot size recommendation */
    lotSizeRecommendation?: string;
    /** Gold-specific: pip value info */
    pipValue?: string;
}

// Gold-specific pairs to scan
export const GOLD_PAIRS = [
    'XAU/USD',  // Gold vs US Dollar (primary)
];

// Extended gold-related instruments
export const GOLD_EXTENDED_PAIRS = [
    'XAU/USD',  // Gold vs US Dollar
    'XAG/USD',  // Silver vs US Dollar
];

export class GoldSignalGenerator {

    /**
     * Generate ICT signals for Gold pairs
     */
    static async generateSignals(
        pairs: string[] = GOLD_PAIRS,
        marketType: MarketType = MarketType.FOREX,
        signalType: SignalType = SignalType.FUTURE
    ): Promise<GoldSignal[]> {
        const signals: GoldSignal[] = [];

        const promises = pairs.map(async (pair) => {
            try {
                return await this.generateSingleSignal(pair, marketType, signalType);
            } catch (err) {
                console.warn(`⚠️ Gold Signal generation failed for ${pair}:`, err);
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
     * Generate a single ICT signal for a gold/metals pair
     */
    private static async generateSingleSignal(
        pair: string,
        marketType: MarketType,
        signalType: SignalType
    ): Promise<GoldSignal | null> {
        // Get current gold price from ExnessAPI
        let realCurrentPrice: number | undefined;
        try {
            realCurrentPrice = await ExnessAPI.getCurrentForexPrice(pair);
        } catch {
            // Will use fallback
        }

        // Fetch HTF data (5-minute candles, 100 candles)
        let htfCandles: Candle[];
        let ltfCandles: Candle[];

        try {
            const htfForexCandles = await ExnessAPI.getForexKlines(pair, '5m', 100);
            htfCandles = this.forexCandlesToICTCandles(htfForexCandles);
        } catch {
            htfCandles = this.generateGoldCandles(pair, 100, '5m', realCurrentPrice);
        }

        try {
            const ltfForexCandles = await ExnessAPI.getForexKlines(pair, '1m', 100);
            ltfCandles = this.forexCandlesToICTCandles(ltfForexCandles);
        } catch {
            ltfCandles = this.generateGoldCandles(pair, 100, '1m', realCurrentPrice);
        }

        if (htfCandles.length < 30 || ltfCandles.length < 30) return null;

        // Use daily open price approximation
        let dailyOpenPrice: number | undefined;
        try {
            // For gold, approximate the daily open from the beginning of HTF candles that fall on the current day
            const now = new Date();
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const todayCandles = htfCandles.filter(c => c.timestamp >= dayStart);
            if (todayCandles.length > 0) {
                dailyOpenPrice = todayCandles[0].open;
            }
        } catch {
            // Ignore
        }

        // Run ICT Engine (same exact engine as Scalping V2)
        const ictSignal = ICTEngine.generateICTSignal(htfCandles, ltfCandles, pair, dailyOpenPrice);
        if (!ictSignal) return null;

        // Validate prices
        if (!ictSignal.entry || isNaN(ictSignal.entry) || ictSignal.entry <= 0) return null;

        // Apply a small offset (0.015%) to entry to give user warning time before trigger
        const isBuy = ictSignal.type === 'BUY';
        const offset = ictSignal.entry * 0.00015; // 0.015% offset (approx $0.75 for Gold)
        
        const entry = isBuy ? ictSignal.entry - offset : ictSignal.entry + offset;
        const stopLoss = isBuy ? ictSignal.stopLoss - offset : ictSignal.stopLoss + offset;
        const tp1 = isBuy ? ictSignal.tp1 - offset : ictSignal.tp1 + offset;
        const tp2 = isBuy ? ictSignal.tp2 - offset : ictSignal.tp2 + offset;
        const tp3 = isBuy ? ictSignal.tp3 - offset : ictSignal.tp3 + offset;

        // Calculate gold-specific lot size recommendation
        const slDistance = Math.abs(entry - stopLoss);
        const lotSizeRecommendation = this.calculateLotSize(slDistance, pair);
        const pipValue = this.getPipValue(pair);

        // Create Gold signal
        const goldSignal: GoldSignal = {
            ...ictSignal,
            id: `GOLD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
            ltfCandles,
            lotSizeRecommendation,
            pipValue
        };

        return goldSignal;
    }

    /**
     * Convert ExnessAPI ForexCandle[] to ICT Engine Candle[] format
     */
    private static forexCandlesToICTCandles(forexCandles: ForexCandle[]): Candle[] {
        return forexCandles.map(fc => ({
            open: fc.open,
            high: fc.high,
            low: fc.low,
            close: fc.close,
            volume: fc.volume,
            timestamp: fc.time
        }));
    }

    /**
     * Generate simulated Gold candle data (fallback)
     */
    private static generateGoldCandles(
        pair: string,
        count: number,
        interval: string,
        customBasePrice?: number
    ): Candle[] {
        const candles: Candle[] = [];
        let basePrice = customBasePrice || this.getBaseGoldPrice(pair);
        const now = Date.now();
        const intervalMs = interval === '1m' ? 60000 : interval === '5m' ? 300000 : 900000;

        // Gold tends to have more sustained trends 
        const trendDirection = Math.random() > 0.5 ? 1 : -1;
        const trendStrength = 0.00015; // Gold-specific trend

        for (let i = 0; i < count; i++) {
            const timestamp = now - (count - i) * intervalMs;
            // Gold volatility is higher than most forex but lower than crypto
            const volatility = interval === '1m' ? 0.0008 : interval === '5m' ? 0.0015 : 0.002;

            const trend = basePrice * trendStrength * trendDirection;
            const random = (Math.random() - 0.5) * basePrice * volatility;
            const open = basePrice;
            const close = basePrice + trend + random;
            const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.4);
            const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.4);

            // Gold typically has high volume
            const volume = 5000 * (0.5 + Math.random() * 2);

            candles.push({ open, high, low, close, volume, timestamp });
            basePrice = close;
        }

        return candles;
    }

    /**
     * Base prices for gold-related instruments
     */
    private static getBaseGoldPrice(pair: string): number {
        // IMPORTANT: These must match ExnessAPI.getGoldPrice() / getSilverPrice() base values
        const prices: Record<string, number> = {
            'XAU/USD': 3350,    // Gold (mid-2026 realistic)
            'XAG/USD': 33.50,   // Silver (mid-2026 realistic)
        };
        return prices[pair] || 3350;
    }

    /**
     * Calculate recommended lot size based on $100 risk per trade
     */
    private static calculateLotSize(slDistanceUSD: number, pair: string): string {
        if (pair === 'XAU/USD') {
            // For XAU/USD: 1 lot = 100 oz, pip = $0.01 movement = $1/lot
            // SL distance in USD, lot = riskAmount / (slDistance * 100)
            const riskAmount = 100; // $100 risk
            const lot = riskAmount / (slDistanceUSD * 100);
            if (lot >= 1) return `${lot.toFixed(2)} lots`;
            return `${(lot).toFixed(2)} lots (${(lot * 100).toFixed(0)} micro lots)`;
        }
        if (pair === 'XAG/USD') {
            const riskAmount = 100;
            const lot = riskAmount / (slDistanceUSD * 5000);
            return `${lot.toFixed(2)} lots`;
        }
        return '0.01 lots';
    }

    /**
     * Get pip value information
     */
    private static getPipValue(pair: string): string {
        if (pair === 'XAU/USD') return '$0.10/pip (0.01 lot) | $1.00/pip (0.1 lot) | $10.00/pip (1.0 lot)';
        if (pair === 'XAG/USD') return '$0.50/pip (0.01 lot) | $5.00/pip (0.1 lot) | $50.00/pip (1.0 lot)';
        return '$10.00/pip (1.0 lot)';
    }

    /**
     * Get current gold price for live updates
     */
    static async getCurrentGoldPrice(pair: string = 'XAU/USD'): Promise<number> {
        try {
            return await ExnessAPI.getCurrentForexPrice(pair);
        } catch {
            return this.getBaseGoldPrice(pair);
        }
    }

    /**
     * Get analysis summary for display
     */
    static getAnalysisSummary(signal: GoldSignal): string[] {
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

        // Gold-specific
        if (signal.lotSizeRecommendation) {
            summary.push(`📏 Lot Size ($100 risk): ${signal.lotSizeRecommendation}`);
        }

        return summary;
    }
}
