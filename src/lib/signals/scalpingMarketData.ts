import { MarketType, SignalType } from './types';
import { BinanceAPI } from './binanceAPI';
import { ExnessAPI } from './exnessAPI';

/**
 * Scalping Market Data Generator
 * Uses 5-minute candles for fast trading
 */
export class ScalpingMarketData {
    /**
     * Generate 5-minute candle market data for scalping
     * Fetches real Binance prices for crypto pairs and Exness-compatible data for Forex
     * @param pair Trading pair (e.g., 'BTC/USDT')
     * @param marketType CRYPTO or FOREX
     * @param candleCount Number of 5-min candles (default 48 = 4 hours)
     */
    static async generateScalpingData(pair: string, marketType: MarketType, candleCount: number = 48, signalType?: SignalType) {
        // Try to fetch real Binance data for crypto pairs
        if (marketType === MarketType.CRYPTO) {
            try {
                const isFuture = signalType === SignalType.FUTURE;
                const binanceData = await BinanceAPI.getScalpingMarketData(pair, isFuture);

                return {
                    pair,
                    marketType,
                    prices: binanceData.prices,
                    volumes: binanceData.volumes,
                    highs: binanceData.highs,
                    lows: binanceData.lows,
                    timeframe: '5m' as const,
                    currentPrice: binanceData.currentPrice
                };
            } catch (error) {
                // Gracefully fall back to simulated data
                if (process.env.NODE_ENV === 'development') {
                    console.info(`📊 Binance API unavailable for ${pair} (scalping) - using simulated data`);
                }
                // Continue to simulated data generation below
            }
        }

        // Try to fetch Exness-compatible data for Forex pairs
        if (marketType === MarketType.FOREX) {
            try {
                // Get 5-minute candles from Exness API
                const candles = await ExnessAPI.getForexKlines(pair, '5m', candleCount);

                if (candles.length > 0) {
                    return {
                        pair,
                        marketType,
                        prices: candles.map(c => c.close),
                        volumes: candles.map(c => c.volume),
                        highs: candles.map(c => c.high),
                        lows: candles.map(c => c.low),
                        timeframe: '5m' as const,
                        currentPrice: candles[candles.length - 1].close
                    };
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.info(`📊 Exness API unavailable for ${pair} (scalping) - using fallback simulation`);
                }
            }
        }

        // Simulated data generation (fallback when APIs fail)
        // Get base price for the pair
        const basePrice = this.getBasePrice(pair, marketType);

        // Generate 5-minute candles (higher volatility than hourly)
        const prices: number[] = [];
        const volumes: number[] = [];
        const highs: number[] = [];
        const lows: number[] = [];

        let currentPrice = basePrice;

        // Scalping parameters (higher volatility for 5-min candles)
        const trendStrength = (Math.random() - 0.5) * 0.003; // 0.3% trend per candle
        const volatility = 0.002 + Math.random() * 0.003; // 0.2-0.5% volatility
        const microMovement = 0.0005; // 0.05% micro movements

        for (let i = 0; i < candleCount; i++) {
            // Trend component (smaller for 5-min)
            const trend = currentPrice * trendStrength;

            // Random walk component
            const random = (Math.random() - 0.5) * currentPrice * volatility;

            // Micro movements (candle wicks)
            const micro = (Math.random() - 0.5) * currentPrice * microMovement;

            // New price
            currentPrice = Math.max(currentPrice + trend + random + micro, basePrice * 0.95);

            // OHLC for this 5-min candle
            const open = i === 0 ? basePrice : prices[i - 1];
            const close = currentPrice;
            const high = Math.max(open, close) * (1 + Math.random() * 0.001); // Small wick up
            const low = Math.min(open, close) * (1 - Math.random() * 0.001); // Small wick down

            prices.push(close);
            highs.push(high);
            lows.push(low);

            // Volume (higher during volatile candles)
            const baseVolume = marketType === MarketType.CRYPTO ? 1000 : 50;
            const volumeSpike = Math.abs(close - open) > basePrice * 0.002 ? 2 : 1;
            volumes.push(baseVolume * (0.5 + Math.random()) * volumeSpike);
        }

        return {
            pair,
            marketType,
            prices,
            volumes,
            highs,
            lows,
            timeframe: '5m' as const,
            currentPrice: prices[prices.length - 1]
        };
    }

    /**
     * Get realistic base prices for pairs
     */
    private static getBasePrice(pair: string, marketType: MarketType): number {
        // Use same base prices as main system but for consistency
        const cryptoPrices: Record<string, number> = {
            'BTC/USDT': 101500,
            'ETH/USDT': 3850,
            'BNB/USDT': 690,
            'SOL/USDT': 230,
            'XRP/USDT': 2.45,
            'ADA/USDT': 1.15,
            'DOGE/USDT': 0.42,
            'MATIC/USDT': 1.15,
            'DOT/USDT': 9.85,
            'AVAX/USDT': 52.30,
        };

        const forexPrices: Record<string, number> = {
            'EUR/USD': 1.0950,
            'GBP/USD': 1.2650,
            'USD/JPY': 148.50,
            'XAU/USD': 2650.00,
            'XAG/USD': 31.50,
        };

        if (marketType === MarketType.CRYPTO) {
            return cryptoPrices[pair] || 100;
        } else {
            return forexPrices[pair] || 1.0;
        }
    }
}
