/**
 * ICT / Smart Money Concepts Engine
 * Institutional-Grade Scalping Signal Generator
 * 
 * HTF: 5 Minute | LTF: 1 Minute
 * 
 * Implements:
 * - Break of Structure (BOS)
 * - Change of Character (CHoCH)
 * - Liquidity Sweeps
 * - Fair Value Gaps (FVG)
 * - Order Blocks (OB)
 * - Premium & Discount Zones
 * - Optimal Trade Entry (OTE)
 * - Daily Bias
 * - Session Filter
 * - Volume Filter
 */

// ============================================
// TYPES
// ============================================

export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export type MarketStructure = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type SwingType = 'HH' | 'HL' | 'LH' | 'LL';

export interface SwingPoint {
    price: number;
    index: number;
    type: 'HIGH' | 'LOW';
    timestamp: number;
}

export interface StructureBreak {
    type: 'BOS' | 'CHoCH';
    direction: 'BULLISH' | 'BEARISH';
    price: number;
    index: number;
    brokenLevel: number;
    timestamp: number;
}

export interface FairValueGap {
    type: 'BULLISH' | 'BEARISH';
    high: number;
    low: number;
    midpoint: number;
    index: number;
    filled: boolean;
    timestamp: number;
}

export interface OrderBlock {
    type: 'BULLISH' | 'BEARISH';
    high: number;
    low: number;
    midpoint: number;
    index: number;
    mitigated: boolean;
    volume: number;
    timestamp: number;
}

export interface LiquiditySweep {
    type: 'BUYSIDE' | 'SELLSIDE';
    sweptLevel: number;
    sweepPrice: number;
    index: number;
    confirmed: boolean;
    timestamp: number;
}

export interface PremiumDiscount {
    premiumZoneHigh: number;
    premiumZoneLow: number;
    equilibrium: number;
    discountZoneHigh: number;
    discountZoneLow: number;
    currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
    swingHigh: number;
    swingLow: number;
}

export interface OTEZone {
    fib62: number;
    fib705: number;
    fib79: number;
    inZone: boolean;
    direction: 'BUY' | 'SELL';
}

export interface DailyBias {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    dailyOpen: number;
    priceAboveOpen: boolean;
    marketStructure: MarketStructure;
    recentBOS: StructureBreak | null;
    confidence: number;
}

export type TradingSession = 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP' | 'ASIAN' | 'CLOSED';

export interface SessionInfo {
    currentSession: TradingSession;
    isAllowed: boolean;
    sessionName: string;
    nextSessionStart?: Date;
}

export interface ICTSignalScore {
    dailyBias: number;       // max 15
    liquiditySweep: number;  // max 20
    orderBlock: number;      // max 15
    fvg: number;             // max 10
    ote: number;             // max 15
    choch: number;           // max 10
    volume: number;          // max 10
    session: number;         // max 5
    total: number;           // max 100
    grade: 'ELITE' | 'A+' | 'A' | 'B' | 'IGNORE';
}

export interface ICTSignal {
    type: 'BUY' | 'SELL';
    score: ICTSignalScore;
    entry: number;
    stopLoss: number;
    tp1: number;
    tp2: number;
    tp3: number;
    riskRewardRatio: number;
    dailyBias: DailyBias;
    liquiditySweep: LiquiditySweep | null;
    oteConfirmation: OTEZone | null;
    orderBlockConfirmation: OrderBlock | null;
    fvgConfirmation: FairValueGap | null;
    volumeConfirmation: boolean;
    sessionConfirmation: SessionInfo;
    premiumDiscount: PremiumDiscount;
    structureBreaks: StructureBreak[];
    chochConfirmation: StructureBreak | null;
    engulfingConfirmation: boolean;
    timestamp: number;
    pair: string;
}

// ============================================
// ICT ENGINE
// ============================================

export class ICTEngine {

    // ─── SWING POINT DETECTION ───────────────────
    static detectSwingPoints(candles: Candle[], lookback: number = 3): SwingPoint[] {
        const swings: SwingPoint[] = [];
        if (candles.length < lookback * 2 + 1) return swings;

        for (let i = lookback; i < candles.length - lookback; i++) {
            let isSwingHigh = true;
            let isSwingLow = true;

            for (let j = 1; j <= lookback; j++) {
                if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
                    isSwingHigh = false;
                }
                if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
                    isSwingLow = false;
                }
            }

            if (isSwingHigh) {
                swings.push({
                    price: candles[i].high,
                    index: i,
                    type: 'HIGH',
                    timestamp: candles[i].timestamp
                });
            }
            if (isSwingLow) {
                swings.push({
                    price: candles[i].low,
                    index: i,
                    type: 'LOW',
                    timestamp: candles[i].timestamp
                });
            }
        }

        return swings.sort((a, b) => a.index - b.index);
    }

    // ─── MARKET STRUCTURE (BOS & CHoCH) ──────────
    static analyzeMarketStructure(candles: Candle[], swings: SwingPoint[]): {
        structure: MarketStructure;
        breaks: StructureBreak[];
    } {
        const breaks: StructureBreak[] = [];
        if (swings.length < 4) return { structure: 'NEUTRAL', breaks };

        const highs = swings.filter(s => s.type === 'HIGH');
        const lows = swings.filter(s => s.type === 'LOW');

        // Determine current structure by analyzing last few swing points
        let prevStructure: MarketStructure = 'NEUTRAL';
        let bullishCount = 0;
        let bearishCount = 0;

        // Check for HH/HL (bullish) or LH/LL (bearish) patterns
        for (let i = 1; i < highs.length; i++) {
            if (highs[i].price > highs[i - 1].price) bullishCount++;
            else bearishCount++;
        }
        for (let i = 1; i < lows.length; i++) {
            if (lows[i].price > lows[i - 1].price) bullishCount++;
            else bearishCount++;
        }

        prevStructure = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';

        // Detect BOS and CHoCH
        for (let i = candles.length - 20; i < candles.length; i++) {
            if (i < 0) continue;
            const candle = candles[i];

            // Check if current candle breaks above a recent swing high
            const recentHighs = highs.filter(h => h.index < i && h.index > i - 30);
            for (const high of recentHighs) {
                if (candle.close > high.price) {
                    const breakType = prevStructure === 'BEARISH' ? 'CHoCH' : 'BOS';
                    // Avoid duplicates
                    if (!breaks.find(b => b.brokenLevel === high.price && b.direction === 'BULLISH')) {
                        breaks.push({
                            type: breakType,
                            direction: 'BULLISH',
                            price: candle.close,
                            index: i,
                            brokenLevel: high.price,
                            timestamp: candle.timestamp
                        });
                    }
                }
            }

            // Check if current candle breaks below a recent swing low
            const recentLows = lows.filter(l => l.index < i && l.index > i - 30);
            for (const low of recentLows) {
                if (candle.close < low.price) {
                    const breakType = prevStructure === 'BULLISH' ? 'CHoCH' : 'BOS';
                    if (!breaks.find(b => b.brokenLevel === low.price && b.direction === 'BEARISH')) {
                        breaks.push({
                            type: breakType,
                            direction: 'BEARISH',
                            price: candle.close,
                            index: i,
                            brokenLevel: low.price,
                            timestamp: candle.timestamp
                        });
                    }
                }
            }
        }

        // Current structure based on most recent breaks
        const recentBreaks = breaks.slice(-3);
        const bullBreaks = recentBreaks.filter(b => b.direction === 'BULLISH').length;
        const bearBreaks = recentBreaks.filter(b => b.direction === 'BEARISH').length;

        let structure: MarketStructure = prevStructure;
        if (bullBreaks > bearBreaks) structure = 'BULLISH';
        else if (bearBreaks > bullBreaks) structure = 'BEARISH';

        return { structure, breaks };
    }

    // ─── FAIR VALUE GAPS ─────────────────────────
    static detectFVGs(candles: Candle[]): FairValueGap[] {
        const fvgs: FairValueGap[] = [];
        if (candles.length < 3) return fvgs;

        for (let i = 2; i < candles.length; i++) {
            const c1 = candles[i - 2]; // First candle
            const c2 = candles[i - 1]; // Middle candle (the imbalance candle)
            const c3 = candles[i];     // Third candle

            // Bullish FVG: c3.low > c1.high (strict) OR imbalance where c2 body is mostly above c1 high
            const bullishGap = c3.low - c1.high;
            const c2Range = c2.high - c2.low;
            if (bullishGap > 0 || (bullishGap > -c2Range * 0.3 && c2.close > c2.open && c2.close > c1.high)) {
                const gapHigh = Math.max(c3.low, c1.high + c2Range * 0.1);
                const gapLow = c1.high;
                if (gapHigh > gapLow) {
                    const currentPrice = candles[candles.length - 1].close;
                    fvgs.push({
                        type: 'BULLISH',
                        high: gapHigh,
                        low: gapLow,
                        midpoint: (gapHigh + gapLow) / 2,
                        index: i - 1,
                        filled: currentPrice <= gapLow,
                        timestamp: candles[i - 1].timestamp
                    });
                }
            }

            // Bearish FVG: c3.high < c1.low (strict) OR imbalance
            const bearishGap = c1.low - c3.high;
            if (bearishGap > 0 || (bearishGap > -c2Range * 0.3 && c2.close < c2.open && c2.close < c1.low)) {
                const gapHigh = c1.low;
                const gapLow = Math.min(c3.high, c1.low - c2Range * 0.1);
                if (gapHigh > gapLow) {
                    const currentPrice = candles[candles.length - 1].close;
                    fvgs.push({
                        type: 'BEARISH',
                        high: gapHigh,
                        low: gapLow,
                        midpoint: (gapHigh + gapLow) / 2,
                        index: i - 1,
                        filled: currentPrice >= gapHigh,
                        timestamp: candles[i - 1].timestamp
                    });
                }
            }
        }

        return fvgs;
    }

    // ─── ORDER BLOCKS ────────────────────────────
    static detectOrderBlocks(candles: Candle[], structureBreaks: StructureBreak[]): OrderBlock[] {
        const obs: OrderBlock[] = [];
        if (candles.length < 5) return obs;

        for (const brk of structureBreaks) {
            // Look for the last opposite candle before the break
            for (let i = brk.index - 1; i >= Math.max(0, brk.index - 10); i--) {
                const candle = candles[i];

                if (brk.direction === 'BULLISH') {
                    // Bullish OB: Last bearish candle before bullish break
                    if (candle.close < candle.open) {
                        const currentPrice = candles[candles.length - 1].close;
                        obs.push({
                            type: 'BULLISH',
                            high: candle.high,
                            low: candle.low,
                            midpoint: (candle.high + candle.low) / 2,
                            index: i,
                            mitigated: currentPrice < candle.low,
                            volume: candle.volume,
                            timestamp: candle.timestamp
                        });
                        break;
                    }
                } else {
                    // Bearish OB: Last bullish candle before bearish break
                    if (candle.close > candle.open) {
                        const currentPrice = candles[candles.length - 1].close;
                        obs.push({
                            type: 'BEARISH',
                            high: candle.high,
                            low: candle.low,
                            midpoint: (candle.high + candle.low) / 2,
                            index: i,
                            mitigated: currentPrice > candle.high,
                            volume: candle.volume,
                            timestamp: candle.timestamp
                        });
                        break;
                    }
                }
            }
        }

        return obs;
    }

    // ─── LIQUIDITY SWEEPS ────────────────────────
    static detectLiquiditySweeps(candles: Candle[], swings: SwingPoint[]): LiquiditySweep[] {
        const sweeps: LiquiditySweep[] = [];
        if (candles.length < 5 || swings.length < 2) return sweeps;

        const windowSize = Math.min(30, candles.length);
        const recentCandles = candles.slice(-windowSize);
        const startIdx = candles.length - windowSize;

        const highs = swings.filter(s => s.type === 'HIGH');
        const lows = swings.filter(s => s.type === 'LOW');

        for (let i = 0; i < recentCandles.length; i++) {
            const candle = recentCandles[i];
            const globalIdx = startIdx + i;

            // Buy-side liquidity sweep (wick above highs then close below, or close near)
            for (const high of highs) {
                if (high.index >= globalIdx) continue;
                const tolerance = high.price * 0.001; // 0.1% tolerance
                if (candle.high > high.price && (candle.close < high.price || candle.close < high.price + tolerance)) {
                    if (!sweeps.find(s => Math.abs(s.sweptLevel - high.price) < tolerance && s.type === 'BUYSIDE')) {
                        sweeps.push({
                            type: 'BUYSIDE',
                            sweptLevel: high.price,
                            sweepPrice: candle.high,
                            index: globalIdx,
                            confirmed: candle.close < high.price,
                            timestamp: candle.timestamp
                        });
                    }
                }
            }

            // Sell-side liquidity sweep (wick below lows then close above, or close near)
            for (const low of lows) {
                if (low.index >= globalIdx) continue;
                const tolerance = low.price * 0.001;
                if (candle.low < low.price && (candle.close > low.price || candle.close > low.price - tolerance)) {
                    if (!sweeps.find(s => Math.abs(s.sweptLevel - low.price) < tolerance && s.type === 'SELLSIDE')) {
                        sweeps.push({
                            type: 'SELLSIDE',
                            sweptLevel: low.price,
                            sweepPrice: candle.low,
                            index: globalIdx,
                            confirmed: candle.close > low.price,
                            timestamp: candle.timestamp
                        });
                    }
                }
            }
        }

        return sweeps;
    }

    // ─── PREMIUM & DISCOUNT ZONES ────────────────
    static calculatePremiumDiscount(candles: Candle[], swings: SwingPoint[]): PremiumDiscount {
        const currentPrice = candles[candles.length - 1].close;
        const highs = swings.filter(s => s.type === 'HIGH');
        const lows = swings.filter(s => s.type === 'LOW');

        // Use most recent valid swing high and low
        const swingHigh = highs.length > 0 ? highs[highs.length - 1].price : Math.max(...candles.slice(-30).map(c => c.high));
        const swingLow = lows.length > 0 ? lows[lows.length - 1].price : Math.min(...candles.slice(-30).map(c => c.low));

        const range = swingHigh - swingLow;
        const equilibrium = swingLow + range * 0.5;

        const premiumZoneHigh = swingHigh;
        const premiumZoneLow = swingLow + range * 0.5;
        const discountZoneHigh = swingLow + range * 0.5;
        const discountZoneLow = swingLow;

        let currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
        if (currentPrice > equilibrium + range * 0.05) currentZone = 'PREMIUM';
        else if (currentPrice < equilibrium - range * 0.05) currentZone = 'DISCOUNT';
        else currentZone = 'EQUILIBRIUM';

        return {
            premiumZoneHigh,
            premiumZoneLow,
            equilibrium,
            discountZoneHigh,
            discountZoneLow,
            currentZone,
            swingHigh,
            swingLow
        };
    }

    // ─── OPTIMAL TRADE ENTRY (OTE) ───────────────
    static calculateOTE(candles: Candle[], swings: SwingPoint[], direction: 'BUY' | 'SELL'): OTEZone {
        const currentPrice = candles[candles.length - 1].close;
        const highs = swings.filter(s => s.type === 'HIGH');
        const lows = swings.filter(s => s.type === 'LOW');

        const swingHigh = highs.length > 0 ? highs[highs.length - 1].price : Math.max(...candles.slice(-30).map(c => c.high));
        const swingLow = lows.length > 0 ? lows[lows.length - 1].price : Math.min(...candles.slice(-30).map(c => c.low));
        const range = swingHigh - swingLow;

        let fib62: number, fib705: number, fib79: number;

        if (direction === 'BUY') {
            // For BUY: Fibonacci retracement from high to low (discount OTE)
            fib62 = swingHigh - range * 0.62;
            fib705 = swingHigh - range * 0.705;
            fib79 = swingHigh - range * 0.79;
        } else {
            // For SELL: Fibonacci retracement from low to high (premium OTE)
            fib62 = swingLow + range * 0.62;
            fib705 = swingLow + range * 0.705;
            fib79 = swingLow + range * 0.79;
        }

        // Check if price is in OTE zone
        let inZone = false;
        if (direction === 'BUY') {
            inZone = currentPrice <= fib62 && currentPrice >= fib79;
        } else {
            inZone = currentPrice >= fib62 && currentPrice <= fib79;
        }

        return { fib62, fib705, fib79, inZone, direction };
    }

    // ─── DAILY BIAS ──────────────────────────────
    static calculateDailyBias(
        candles: Candle[], 
        htfStructure: MarketStructure, 
        htfBreaks: StructureBreak[], 
        actualDailyOpen?: number
    ): DailyBias {
        const currentPrice = candles[candles.length - 1].close;

        // Daily open = actualDailyOpen if provided, otherwise first candle open of the day (approximate)
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayCandles = candles.filter(c => c.timestamp >= dayStart);
        const dailyOpen = actualDailyOpen || (todayCandles.length > 0 ? todayCandles[0].open : candles[Math.max(0, candles.length - 60)].open);

        const priceAboveOpen = currentPrice > dailyOpen;

        // Recent bullish/bearish BOS
        const recentBullishBOS = htfBreaks.filter(b => b.direction === 'BULLISH' && b.type === 'BOS').slice(-1)[0] || null;
        const recentBearishBOS = htfBreaks.filter(b => b.direction === 'BEARISH' && b.type === 'BOS').slice(-1)[0] || null;

        let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        let confidence = 0;
        let recentBOS: StructureBreak | null = null;

        // Bullish Daily Bias conditions
        const bullishConditions = [
            priceAboveOpen,
            htfStructure === 'BULLISH',
            recentBullishBOS !== null
        ];
        const bullishScore = bullishConditions.filter(Boolean).length;

        // Bearish Daily Bias conditions
        const bearishConditions = [
            !priceAboveOpen,
            htfStructure === 'BEARISH',
            recentBearishBOS !== null
        ];
        const bearishScore = bearishConditions.filter(Boolean).length;

        if (bullishScore >= 2) {
            bias = 'BULLISH';
            confidence = (bullishScore / 3) * 100;
            recentBOS = recentBullishBOS;
        } else if (bearishScore >= 2) {
            bias = 'BEARISH';
            confidence = (bearishScore / 3) * 100;
            recentBOS = recentBearishBOS;
        }

        return {
            bias,
            dailyOpen,
            priceAboveOpen,
            marketStructure: htfStructure,
            recentBOS,
            confidence
        };
    }

    // ─── SESSION FILTER ──────────────────────────
    static getCurrentSession(): SessionInfo {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const utcTime = utcHour + utcMinutes / 60;

        // Trading sessions in UTC
        // London: 07:00 - 16:00 UTC
        // New York: 13:00 - 22:00 UTC
        // Overlap: 13:00 - 16:00 UTC
        // Asian: 00:00 - 07:00 UTC

        let session: TradingSession;
        let isAllowed: boolean;
        let sessionName: string;

        if (utcTime >= 13 && utcTime < 16) {
            session = 'LONDON_NY_OVERLAP';
            sessionName = 'London / New York Overlap';
            isAllowed = true;
        } else if (utcTime >= 7 && utcTime < 13) {
            session = 'LONDON';
            sessionName = 'London Open';
            isAllowed = true;
        } else if (utcTime >= 13 && utcTime < 22) {
            session = 'NEW_YORK';
            sessionName = 'New York Open';
            isAllowed = true;
        } else if (utcTime >= 0 && utcTime < 7) {
            session = 'ASIAN';
            sessionName = 'Asian Session';
            isAllowed = false;
        } else {
            session = 'CLOSED';
            sessionName = 'Market Closed';
            isAllowed = false;
        }

        return { currentSession: session, isAllowed, sessionName };
    }

    // ─── VOLUME FILTER ───────────────────────────
    static checkVolumeFilter(candles: Candle[]): boolean {
        if (candles.length < 20) return false;

        const currentVolume = candles[candles.length - 1].volume;

        // 20-period average volume
        const avg20 = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;

        // Last 5 candle average volume
        const avg5 = candles.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;

        return currentVolume > avg20 && currentVolume > avg5;
    }

    // ─── ENGULFING CANDLE DETECTION ──────────────
    static detectEngulfing(candles: Candle[]): { bullish: boolean; bearish: boolean } {
        if (candles.length < 2) return { bullish: false, bearish: false };

        const prev = candles[candles.length - 2];
        const curr = candles[candles.length - 1];

        const bullishEngulfing = prev.close < prev.open && // Previous is bearish
            curr.close > curr.open && // Current is bullish
            curr.close > prev.open && // Current close > previous open
            curr.open < prev.close;  // Current open < previous close

        const bearishEngulfing = prev.close > prev.open && // Previous is bullish
            curr.close < curr.open && // Current is bearish
            curr.close < prev.open && // Current close < previous open
            curr.open > prev.close;  // Current open > previous close

        return { bullish: bullishEngulfing, bearish: bearishEngulfing };
    }

    // ─── SIGNAL SCORING ──────────────────────────
    static scoreSignal(
        dailyBias: DailyBias,
        liquiditySweep: LiquiditySweep | null,
        orderBlock: OrderBlock | null,
        fvg: FairValueGap | null,
        ote: OTEZone | null,
        choch: StructureBreak | null,
        volumeConfirmed: boolean,
        session: SessionInfo
    ): ICTSignalScore {
        let dailyBiasScore = 0;
        let liquiditySweepScore = 0;
        let orderBlockScore = 0;
        let fvgScore = 0;
        let oteScore = 0;
        let chochScore = 0;
        let volumeScore = 0;
        let sessionScore = 0;

        // Daily Bias: max 15
        if (dailyBias.bias !== 'NEUTRAL') {
            dailyBiasScore = Math.round(dailyBias.confidence * 0.15);
        }

        // Liquidity Sweep: max 20
        if (liquiditySweep && liquiditySweep.confirmed) {
            liquiditySweepScore = 20;
        } else if (liquiditySweep) {
            liquiditySweepScore = 10;
        }

        // Order Block: max 15
        if (orderBlock && !orderBlock.mitigated) {
            orderBlockScore = 15;
        } else if (orderBlock) {
            orderBlockScore = 8;
        }

        // FVG: max 10
        if (fvg && !fvg.filled) {
            fvgScore = 10;
        } else if (fvg) {
            fvgScore = 5;
        }

        // OTE: max 15
        if (ote && ote.inZone) {
            oteScore = 15;
        }

        // CHoCH: max 10
        if (choch && choch.type === 'CHoCH') {
            chochScore = 10;
        } else if (choch && choch.type === 'BOS') {
            chochScore = 6;
        }

        // Volume: max 10
        if (volumeConfirmed) {
            volumeScore = 10;
        }

        // Session: max 5
        if (session.currentSession === 'LONDON_NY_OVERLAP') {
            sessionScore = 5;
        } else if (session.isAllowed) {
            sessionScore = 3;
        }

        const total = dailyBiasScore + liquiditySweepScore + orderBlockScore + fvgScore + oteScore + chochScore + volumeScore + sessionScore;

        let grade: ICTSignalScore['grade'];
        if (total >= 88) grade = 'ELITE';
        else if (total >= 78) grade = 'A+';
        else if (total >= 68) grade = 'A';
        else if (total >= 55) grade = 'B';
        else grade = 'IGNORE';

        return {
            dailyBias: dailyBiasScore,
            liquiditySweep: liquiditySweepScore,
            orderBlock: orderBlockScore,
            fvg: fvgScore,
            ote: oteScore,
            choch: chochScore,
            volume: volumeScore,
            session: sessionScore,
            total,
            grade
        };
    }

    // ─── GENERATE ICT SIGNAL ─────────────────────
    static generateICTSignal(
        htfCandles: Candle[],  // 5-minute candles
        ltfCandles: Candle[],  // 1-minute candles
        pair: string,
        actualDailyOpen?: number
    ): ICTSignal | null {
        if (htfCandles.length < 30 || ltfCandles.length < 30) return null;

        // 1. Session Filter
        const session = this.getCurrentSession();
        // Note: We still analyze during non-allowed sessions for crypto markets

        // 2. HTF Analysis (5-min)
        const htfSwings = this.detectSwingPoints(htfCandles, 2);
        const { structure: htfStructure, breaks: htfBreaks } = this.analyzeMarketStructure(htfCandles, htfSwings);

        // 3. Daily Bias
        const dailyBias = this.calculateDailyBias(htfCandles, htfStructure, htfBreaks, actualDailyOpen);

        // 4. LTF Analysis (1-min)
        const ltfSwings = this.detectSwingPoints(ltfCandles, 2);
        const { breaks: ltfBreaks } = this.analyzeMarketStructure(ltfCandles, ltfSwings);

        // 5. Detect structures
        const fvgs = this.detectFVGs(htfCandles);
        const liquiditySweeps = this.detectLiquiditySweeps(htfCandles, htfSwings);
        const orderBlocks = this.detectOrderBlocks(htfCandles, htfBreaks);
        const premiumDiscount = this.calculatePremiumDiscount(htfCandles, htfSwings);

        // 6. Volume Filter
        const volumeConfirmed = this.checkVolumeFilter(ltfCandles);

        // 7. Engulfing Detection
        const engulfing = this.detectEngulfing(ltfCandles);

        const currentPrice = ltfCandles[ltfCandles.length - 1].close;

        // ─── BUY SIGNAL CHECK ─────────────
        if (dailyBias.bias === 'BULLISH') {
            const sellSideSweep = liquiditySweeps.find(s => s.type === 'SELLSIDE');
            const inDiscount = premiumDiscount.currentZone === 'DISCOUNT' || premiumDiscount.currentZone === 'EQUILIBRIUM';
            // OB proximity: price within or near (0.15%) the OB zone
            const bullishOB = orderBlocks.find(ob => {
                if (ob.type !== 'BULLISH') return false;
                const range = ob.high - ob.low;
                const proximity = Math.max(range * 0.2, currentPrice * 0.0015);
                return currentPrice >= ob.low - proximity && currentPrice <= ob.high + proximity;
            });
            const bullishFVG = fvgs.find(f => {
                if (f.type !== 'BULLISH') return false;
                const range = f.high - f.low;
                const proximity = Math.max(range * 0.2, currentPrice * 0.0015);
                return currentPrice >= f.low - proximity && currentPrice <= f.high + proximity;
            });
            const ote = this.calculateOTE(htfCandles, htfSwings, 'BUY');
            const bullishCHoCH = ltfBreaks.find(b => b.type === 'CHoCH' && b.direction === 'BULLISH');
            const bullishBOS = ltfBreaks.find(b => b.type === 'BOS' && b.direction === 'BULLISH');
            // Also check HTF structure breaks
            const htfBullishBOS = htfBreaks.find(b => b.direction === 'BULLISH');

            // Check conditions (any structure + any zone/sweep is enough to score)
            const hasStructureConfirmation = bullishCHoCH || bullishBOS || htfBullishBOS;
            const hasZoneConfirmation = bullishOB || bullishFVG;

            const isAllowedZone = premiumDiscount.currentZone === 'DISCOUNT' || premiumDiscount.currentZone === 'EQUILIBRIUM';
            if (isAllowedZone && (hasStructureConfirmation || hasZoneConfirmation || sellSideSweep)) {
                const score = this.scoreSignal(
                    dailyBias,
                    sellSideSweep || null,
                    bullishOB || null,
                    bullishFVG || null,
                    ote,
                    bullishCHoCH || bullishBOS || null,
                    volumeConfirmed,
                    session
                );

                // Only generate Elite and A+ setups
                if (score.grade === 'ELITE' || score.grade === 'A+' || score.grade === 'A') {
                    const slLevel = sellSideSweep ? sellSideSweep.sweepPrice : premiumDiscount.swingLow;
                    const minSL = this.getMinSLBuffer(pair, currentPrice);
                    const slDistance = Math.max(currentPrice - slLevel, minSL);

                    const target1 = currentPrice + slDistance * 1.5;  // 1:1.5 RR
                    const target2 = currentPrice + slDistance * 3;    // 1:3 RR
                    const target3 = premiumDiscount.swingHigh > (currentPrice + slDistance * 3) ? premiumDiscount.swingHigh : currentPrice + slDistance * 5; // Opposite liquidity

                    // Sort targets in ascending order (closest to furthest)
                    const sortedTargets = [target1, target2, target3].sort((a, b) => a - b);

                    return {
                        type: 'BUY',
                        score,
                        entry: currentPrice,
                        stopLoss: currentPrice - slDistance,
                        tp1: sortedTargets[0],
                        tp2: sortedTargets[1],
                        tp3: sortedTargets[2],
                        riskRewardRatio: 1.5,
                        dailyBias,
                        liquiditySweep: sellSideSweep || null,
                        oteConfirmation: ote.inZone ? ote : null,
                        orderBlockConfirmation: bullishOB || null,
                        fvgConfirmation: bullishFVG || null,
                        volumeConfirmation: volumeConfirmed,
                        sessionConfirmation: session,
                        premiumDiscount,
                        structureBreaks: [...htfBreaks, ...ltfBreaks],
                        chochConfirmation: bullishCHoCH || bullishBOS || null,
                        engulfingConfirmation: engulfing.bullish,
                        timestamp: Date.now(),
                        pair
                    };
                }
            }
        }

        // ─── SELL SIGNAL CHECK ────────────
        if (dailyBias.bias === 'BEARISH') {
            const buySideSweep = liquiditySweeps.find(s => s.type === 'BUYSIDE');
            const inPremium = premiumDiscount.currentZone === 'PREMIUM' || premiumDiscount.currentZone === 'EQUILIBRIUM';
            const bearishOB = orderBlocks.find(ob => {
                if (ob.type !== 'BEARISH') return false;
                const range = ob.high - ob.low;
                const proximity = Math.max(range * 0.2, currentPrice * 0.0015);
                return currentPrice >= ob.low - proximity && currentPrice <= ob.high + proximity;
            });
            const bearishFVG = fvgs.find(f => {
                if (f.type !== 'BEARISH') return false;
                const range = f.high - f.low;
                const proximity = Math.max(range * 0.2, currentPrice * 0.0015);
                return currentPrice >= f.low - proximity && currentPrice <= f.high + proximity;
            });
            const ote = this.calculateOTE(htfCandles, htfSwings, 'SELL');
            const bearishCHoCH = ltfBreaks.find(b => b.type === 'CHoCH' && b.direction === 'BEARISH');
            const bearishBOS = ltfBreaks.find(b => b.type === 'BOS' && b.direction === 'BEARISH');
            const htfBearishBOS = htfBreaks.find(b => b.direction === 'BEARISH');

            const hasStructureConfirmation = bearishCHoCH || bearishBOS || htfBearishBOS;
            const hasZoneConfirmation = bearishOB || bearishFVG;

            const isAllowedZone = premiumDiscount.currentZone === 'PREMIUM' || premiumDiscount.currentZone === 'EQUILIBRIUM';
            if (isAllowedZone && (hasStructureConfirmation || hasZoneConfirmation || buySideSweep)) {
                const score = this.scoreSignal(
                    dailyBias,
                    buySideSweep || null,
                    bearishOB || null,
                    bearishFVG || null,
                    ote,
                    bearishCHoCH || bearishBOS || null,
                    volumeConfirmed,
                    session
                );

                if (score.grade === 'ELITE' || score.grade === 'A+' || score.grade === 'A') {
                    const slLevel = buySideSweep ? buySideSweep.sweepPrice : premiumDiscount.swingHigh;
                    const minSL = this.getMinSLBuffer(pair, currentPrice);
                    const slDistance = Math.max(slLevel - currentPrice, minSL);

                    const target1 = currentPrice - slDistance * 1.5;  // 1:1.5 RR
                    const target2 = currentPrice - slDistance * 3;    // 1:3 RR
                    const target3 = premiumDiscount.swingLow < (currentPrice - slDistance * 3) ? premiumDiscount.swingLow : currentPrice - slDistance * 5;

                    // Sort targets in descending order (closest to furthest for short)
                    const sortedTargets = [target1, target2, target3].sort((a, b) => b - a);

                    return {
                        type: 'SELL',
                        score,
                        entry: currentPrice,
                        stopLoss: currentPrice + slDistance,
                        tp1: sortedTargets[0],
                        tp2: sortedTargets[1],
                        tp3: sortedTargets[2],
                        riskRewardRatio: 1.5,
                        dailyBias,
                        liquiditySweep: buySideSweep || null,
                        oteConfirmation: ote.inZone ? ote : null,
                        orderBlockConfirmation: bearishOB || null,
                        fvgConfirmation: bearishFVG || null,
                        volumeConfirmation: volumeConfirmed,
                        sessionConfirmation: session,
                        premiumDiscount,
                        structureBreaks: [...htfBreaks, ...ltfBreaks],
                        chochConfirmation: bearishCHoCH || bearishBOS || null,
                        engulfingConfirmation: engulfing.bearish,
                        timestamp: Date.now(),
                        pair
                    };
                }
            }
        }

        return null;
    }

    private static getMinSLBuffer(pair: string, currentPrice: number): number {
        const key = pair.toUpperCase();
        const isGold = key.includes('XAU');
        const isSilver = key.includes('XAG');
        const isForex = key.includes('EUR') || key.includes('GBP') || key.includes('JPY') || 
                        key.includes('CHF') || key.includes('AUD') || key.includes('CAD') || 
                        key.includes('NZD');
        
        if (isGold) {
            // Gold: Minimum 0.08% buffer (approx $2.10 at $2650)
            return currentPrice * 0.0008;
        }
        if (isSilver) {
            // Silver: Minimum 0.15% buffer (approx $0.05 at $31.50)
            return currentPrice * 0.0015;
        }
        if (isForex) {
            // Forex: Minimum 0.08% buffer (approx 8-10 pips)
            return currentPrice * 0.0008;
        }
        // Crypto (Default): 0.4% buffer
        return currentPrice * 0.004;
    }
}
