import { Signal, SignalType, SignalDirection, MarketType, SignalStatus, Timeframe } from './types';
import { ScalpingMarketData } from './scalpingMarketData';
import { ExchangeAvailability } from './exchangeAvailability';

/**
 * Scalping Signal Generator
 * Fast trading signals for 15-60 minute profit targets
 */
export class ScalpingSignalGenerator {
    /**
     * Generate scalping signals for multiple pairs
     */
    static async generateScalpingSignals(
        pairs: Array<{ pair: string; marketType: MarketType }>,
        signalType: SignalType
    ): Promise<Signal[]> {
        const signals: Signal[] = [];

        for (const { pair, marketType } of pairs) {
            const signal = await this.generateSingleScalpingSignal(pair, marketType, signalType);
            if (signal) {
                signals.push(signal);
            }
        }

        return signals.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Generate single scalping signal
     */
    private static async generateSingleScalpingSignal(
        pair: string,
        marketType: MarketType,
        signalType: SignalType
    ): Promise<Signal | null> {
        // Get 15-minute candle data (now fetches real Binance prices)
        const data = await ScalpingMarketData.generateScalpingData(pair, marketType, 48, signalType);
        const { prices, volumes } = data;
        const currentPrice = prices[prices.length - 1];

        // COMPREHENSIVE PRICE VALIDATION
        // Filter out invalid prices that would show as 0.0000 or cause errors
        if (!currentPrice || isNaN(currentPrice) || !isFinite(currentPrice) || currentPrice <= 0) {
            console.log(`⚠️ Skipping ${pair} - invalid price (${currentPrice})`);
            return null;
        }

        // Reject extremely low-priced coins (< $0.0001)
        if (currentPrice < 0.0001) {
            console.log(`⚠️ Skipping ${pair} - price too low (${currentPrice})`);
            return null;
        }

        // Calculate fast indicators for scalping
        const rsi = this.calculateFastRSI(prices, 7); // 7-period RSI (faster)
        const macd = this.calculateFastMACD(prices); // Faster MACD
        const volumeRatio = volumes[volumes.length - 1] / (volumes.reduce((a, b) => a + b) / volumes.length);

        // Scalping score calculation
        let buyScore = 0;
        let sellScore = 0;

        // RSI Scoring (HIGHER WEIGHT - RSI is critical for scalping!)
        if (rsi < 35) {
            buyScore += 30; // Oversold - strong buy signal
            // Prevent SHORT when oversold
            if (rsi < 25) sellScore = 0;
        } else if (rsi > 65) {
            sellScore += 30; // Overbought - strong sell signal
            // Prevent LONG when overbought
            if (rsi > 75) buyScore = 0;
        }

        // MACD Scoring
        if (macd.histogram > 0 && macd.histogram > macd.previousHistogram) {
            if (rsi < 65) buyScore += 25; // Only add if not overbought
        } else if (macd.histogram < 0 && macd.histogram < macd.previousHistogram) {
            if (rsi > 35) sellScore += 25; // Only add if not oversold
        }

        // Additional MACD signals (only if RSI allows)
        if (macd.histogram > 0 && rsi < 60) buyScore += 10;
        if (macd.histogram < 0 && rsi > 40) sellScore += 10;

        // Volume confirmation (doesn't add to direction, just confirms)
        let volumeBoost = 0;
        if (volumeRatio >= 2.0) {
            volumeBoost = 15;
        } else if (volumeRatio >= 1.0) {
            volumeBoost = 10;
        } else if (volumeRatio < 0.8) {
            return null; // Skip very low volume signals
        }

        // Apply volume boost to winning direction only (not both!)
        // We'll apply this after determining direction

        // Short-term momentum
        const momentum = (currentPrice - prices[prices.length - 10]) / prices[prices.length - 10];
        if (momentum > 0.001 && rsi < 60) buyScore += 10;
        if (momentum < -0.001 && rsi > 40) sellScore += 10;

        // Determine preliminary direction
        let preliminaryBuyScore = buyScore;
        let preliminarySellScore = sellScore;

        // Apply volume boost to the winning direction only
        if (preliminaryBuyScore > preliminarySellScore) {
            buyScore += volumeBoost;
        } else if (preliminarySellScore > preliminaryBuyScore) {
            sellScore += volumeBoost;
        }

        // Minimum score for scalping
        const MIN_SCORE = 30;
        let direction: SignalDirection | null = null;
        let confidence = 0;

        if (buyScore >= MIN_SCORE && buyScore > sellScore) {
            direction = signalType === SignalType.FUTURE ? SignalDirection.LONG : SignalDirection.BUY;
            confidence = Math.round(Math.min((buyScore / 70) * 100, 95));
        } else if (sellScore >= MIN_SCORE && sellScore > buyScore) {
            if (signalType === SignalType.SPOT) return null; // No SELL for SPOT
            direction = SignalDirection.SHORT;
            confidence = Math.round(Math.min((sellScore / 70) * 100, 95));
        } else {
            return null; // Not strong enough
        }

        // Calculate scalping TP/SL (tight levels)
        const { tp1, tp2, tp3, stopLoss } = this.calculateScalpingLevels(
            currentPrice,
            direction,
            prices
        );

        // Get available exchanges for this pair
        const availableExchanges = ExchangeAvailability.getAvailableExchanges(pair, marketType);

        // Create signal
        const signal: Signal = {
            id: `SCALP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            pair,
            direction,
            entryPrice: currentPrice,
            currentPrice,
            takeProfit: tp3,
            takeProfit1: tp1,
            takeProfit2: tp2,
            takeProfit3: tp3,
            stopLoss,
            confidence,
            rsi,
            macdValue: macd.value,
            macdSignal: macd.signal,
            marketType,
            signalType,
            status: SignalStatus.ACTIVE,
            timestamp: new Date(), // Correct field name!
            timeframe: Timeframe.FIFTEEN_MINUTES, // Scalping timeframe
            tp1Hit: false,
            tp2Hit: false,
            tp3Hit: false,
            highestPrice: currentPrice,
            lowestPrice: currentPrice,
            rationalePoints: [this.generateScalpingRationale(rsi, macd, volumeRatio, direction)],
            availableExchanges // Add exchange availability
        };

        return signal;
    }

    /**
     * Calculate fast RSI (7-period for scalping)
     */
    private static calculateFastRSI(prices: number[], period: number = 7): number {
        if (prices.length < period + 1) return 50;

        let gains = 0;
        let losses = 0;

        for (let i = prices.length - period; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate fast MACD (5, 13, 4 for scalping)
     */
    private static calculateFastMACD(prices: number[]) {
        const ema5 = this.calculateEMA(prices, 5);
        const ema13 = this.calculateEMA(prices, 13);
        const macdLine = ema5 - ema13;

        // Signal line (4-period EMA of MACD)
        const macdHistory = [macdLine]; // Simplified
        const signal = macdLine * 0.8; // Approximation
        const histogram = macdLine - signal;
        const previousHistogram = histogram * 0.9; // Approximation

        return {
            value: macdLine,
            signal,
            histogram,
            previousHistogram
        };
    }

    /**
     * Calculate EMA
     */
    private static calculateEMA(prices: number[], period: number): number {
        const multiplier = 2 / (period + 1);
        let ema = prices[prices.length - period];

        for (let i = prices.length - period + 1; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }

        return ema;
    }

    /**
     * Calculate tight TP/SL levels for scalping
     */
    private static calculateScalpingLevels(
        entryPrice: number,
        direction: SignalDirection,
        prices: number[]
    ) {
        // Calculate volatility (standard deviation of returns)
        const volatility = this.calculateVolatility(prices);
        
        // For 15-minute scalping, expected move is typically 1-3x the standard deviation
        // If volatility is extremely low (e.g., Forex), ensure a minimum threshold so TPs aren't zero
        const safeVolatility = Math.max(volatility, 0.0005); 

        // Dynamic targets based on the specific asset's real-time volatility
        const tp1Dist = safeVolatility * 1.5; // ~1.5x volatility
        const tp2Dist = safeVolatility * 3.0; // ~3.0x volatility
        const tp3Dist = safeVolatility * 4.5; // ~4.5x volatility
        const slDist = safeVolatility * 1.0;  // tight 1.0x volatility stop

        if (direction === SignalDirection.BUY || direction === SignalDirection.LONG) {
            return {
                tp1: entryPrice * (1 + tp1Dist), 
                tp2: entryPrice * (1 + tp2Dist), 
                tp3: entryPrice * (1 + tp3Dist), 
                stopLoss: entryPrice * (1 - slDist) 
            };
        } else {
            return {
                tp1: entryPrice * (1 - tp1Dist),
                tp2: entryPrice * (1 - tp2Dist),
                tp3: entryPrice * (1 - tp3Dist),
                stopLoss: entryPrice * (1 + slDist)
            };
        }
    }

    /**
     * Calculate volatility
     */
    private static calculateVolatility(prices: number[]): number {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        const mean = returns.reduce((a, b) => a + b) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    /**
     * Generate scalping rationale
     */
    private static generateScalpingRationale(
        rsi: number,
        macd: any,
        volumeRatio: number,
        direction: SignalDirection
    ): string {
        const reasons: string[] = [];

        if (direction === SignalDirection.LONG || direction === SignalDirection.BUY) {
            if (rsi < 40) reasons.push('RSI oversold - bounce expected');
            if (macd.histogram > 0) reasons.push('MACD bullish momentum');
            if (volumeRatio >= 2) reasons.push('Strong buying volume');
        } else {
            if (rsi > 60) reasons.push('RSI overbought - pullback expected');
            if (macd.histogram < 0) reasons.push('MACD bearish momentum');
            if (volumeRatio >= 2) reasons.push('Strong selling volume');
        }

        reasons.push('15-min scalping setup - quick exit expected');

        return reasons.join(' • ');
    }
}
