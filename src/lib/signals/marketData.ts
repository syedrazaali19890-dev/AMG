// Market Data Management

import { MarketType, MarketData, SignalType } from './types';
import { BinanceAPI } from './binanceAPI';
import { MexcAPI } from './mexcAPI';
import { ExnessAPI } from './exnessAPI';

export class MarketDataManager {
    static generateSimulatedData(
        pair: string,
        marketType: MarketType,
        dataPoints: number = 100
    ): MarketData {
        const prices: number[] = [];
        const volumes: number[] = [];
        const timestamps: Date[] = [];

        let basePrice = marketType === MarketType.FOREX ? 1.1 : 97500;

        // Crypto specific prices
        if (pair.includes('BTC')) basePrice = 97500;
        if (pair.includes('ETH')) basePrice = 3350;
        if (pair.includes('BNB')) basePrice = 620;
        if (pair.includes('XRP')) basePrice = 1.42;
        if (pair.includes('ADA')) basePrice = 0.98;
        if (pair.includes('SOL')) basePrice = 131;
        if (pair.includes('DOGE')) basePrice = 0.38;
        if (pair.includes('DOT')) basePrice = 6.85;
        if (pair.includes('MATIC')) basePrice = 0.52;
        if (pair.includes('AVAX')) basePrice = 38.5;
        if (pair.includes('LINK')) basePrice = 20.5;
        if (pair.includes('UNI')) basePrice = 12.5;
        if (pair.includes('LTC')) basePrice = 95;
        if (pair.includes('ATOM')) basePrice = 9.8;
        if (pair.includes('ETC')) basePrice = 28;
        if (pair.includes('XLM')) basePrice = 0.12;
        if (pair.includes('ALGO')) basePrice = 0.28;
        if (pair.includes('VET')) basePrice = 0.035;
        if (pair.includes('FIL')) basePrice = 5.2;
        if (pair.includes('TRX')) basePrice = 0.19;
        if (pair.includes('AAVE')) basePrice = 185;
        if (pair.includes('SAND')) basePrice = 0.58;
        if (pair.includes('MANA')) basePrice = 0.62;
        if (pair.includes('AXS')) basePrice = 8.5;
        if (pair.includes('THETA')) basePrice = 2.1;
        if (pair.includes('FTM')) basePrice = 0.85;
        if (pair.includes('NEAR')) basePrice = 5.8;
        if (pair.includes('APE')) basePrice = 1.45;
        if (pair.includes('SHIB')) basePrice = 0.000025;
        if (pair.includes('CRO')) basePrice = 0.16;

        // Forex specific prices
        if (pair.includes('GBP')) basePrice = 1.27;
        if (pair.includes('JPY')) basePrice = 150;
        if (pair.includes('CHF')) basePrice = 0.88;
        if (pair.includes('AUD')) basePrice = 0.65;
        if (pair.includes('CAD')) basePrice = 1.39;
        if (pair.includes('NZD')) basePrice = 0.59;
        if (pair.includes('XAU')) basePrice = 2650; // Gold price
        if (pair.includes('XAG')) basePrice = 31.50; // Silver price

        const now = new Date();

        // Create more realistic market movements for Forex
        // Add trending behavior and volatility
        const trendDirection = Math.random() > 0.5 ? 1 : -1; // Random trend direction
        const trendStrength = 0.0005 + Math.random() * 0.001; // 0.05% to 0.15% per candle (increased by 20%)

        for (let i = 0; i < dataPoints; i++) {
            // Combine trend with noise for realistic movement
            const trend = trendDirection * trendStrength; // Consistent trend
            const volatility = (Math.random() - 0.5) * 0.018; // ±0.9% random volatility (increased by 20%)
            const microMovement = (Math.random() - 0.5) * 0.004; // Small noise (increased by 20%)

            // Total change combines trend, volatility, and noise
            const change = trend + volatility + microMovement;

            basePrice = basePrice * (1 + change);
            prices.push(basePrice);

            const baseVolume = marketType === MarketType.FOREX ? 1000000 : 100;
            const volume = baseVolume * (0.5 + Math.random());
            volumes.push(volume);

            const timestamp = new Date(now.getTime() - (dataPoints - i) * 60 * 60 * 1000);
            timestamps.push(timestamp);
        }

        return {
            pair,
            marketType,
            prices,
            volumes,
            timestamps,
            currentPrice: prices[prices.length - 1]
        };
    }

    static async generateMarketData(
        pair: string,
        marketType: MarketType,
        dataPoints: number = 100,
        signalType?: SignalType
    ): Promise<MarketData> {
        if (marketType === MarketType.CRYPTO) {
            try {
                const isFuture = signalType === SignalType.FUTURE;
                const binanceData = await BinanceAPI.getMarketDataWithRealPrices(pair, isFuture);
                return {
                    pair,
                    marketType,
                    prices: binanceData.prices,
                    volumes: binanceData.volumes,
                    timestamps: binanceData.timestamps,
                    currentPrice: binanceData.currentPrice
                };
            } catch (error) {
                console.warn(`Failed to fetch Binance data for ${pair}, using simulated data`);
                return this.generateSimulatedData(pair, marketType, dataPoints);
            }
        } else if (marketType === MarketType.FOREX) {
            // Use Exness-compatible Forex API for Forex pairs
            try {
                const exnessData = await ExnessAPI.getMarketDataWithExnessPrices(pair);
                return {
                    pair,
                    marketType,
                    prices: exnessData.prices,
                    volumes: exnessData.volumes,
                    timestamps: exnessData.timestamps,
                    currentPrice: exnessData.currentPrice
                };
            } catch (error) {
                console.warn(`Failed to fetch Exness data for ${pair}, using simulated data`);
                return this.generateSimulatedData(pair, marketType, dataPoints);
            }
        }
        return this.generateSimulatedData(pair, marketType, dataPoints);
    }

    static getForexPairs(): string[] {
        return [
            // Major Pairs
            'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
            'USD/CAD', 'NZD/USD',

            // Cross Pairs
            'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'EUR/AUD',
            'EUR/CAD', 'GBP/CHF', 'GBP/AUD', 'AUD/JPY', 'AUD/CAD',
            'CAD/JPY', 'CHF/JPY', 'NZD/JPY',

            // Exotic Pairs (High Opportunity)
            'USD/TRY', 'USD/MXN', 'USD/ZAR', 'USD/SGD', 'USD/HKD',
            'USD/NOK', 'USD/SEK',

            // Precious Metals
            'XAU/USD',  // Gold
            'XAG/USD',  // Silver

            // Commodities
            'CL/USD'    // Crude Oil
        ];
    }

    static getCryptoPairs(): string[] {
        return [
            // Top 10 Market Cap - VERIFIED ON BINANCE
            'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
            'SOL/USDT', 'DOGE/USDT', 'TRX/USDT', 'AVAX/USDT', 'DOT/USDT',

            // Top 11-30 - VERIFIED ON BINANCE
            'MATIC/USDT', 'LINK/USDT', 'UNI/USDT', 'LTC/USDT', 'ATOM/USDT',
            'ETC/USDT', 'XLM/USDT', 'ALGO/USDT', 'VET/USDT', 'FIL/USDT',
            'AAVE/USDT', 'SAND/USDT', 'MANA/USDT', 'AXS/USDT', 'THETA/USDT',
            'FTM/USDT', 'NEAR/USDT', 'APE/USDT', 'SHIB/USDT', 'CRO/USDT',

            // Top 31-60 - VERIFIED ON BINANCE & BYBIT
            'ICP/USDT', 'APT/USDT', 'ARB/USDT', 'OP/USDT', 'INJ/USDT',
            'SUI/USDT', 'SEI/USDT', 'HBAR/USDT', 'IMX/USDT', 'RUNE/USDT',
            'GRT/USDT', 'SNX/USDT', 'FLOW/USDT', 'XTZ/USDT',
            'EGLD/USDT', 'KAVA/USDT', 'ZIL/USDT', 'ENJ/USDT', 'CHZ/USDT',
            'COMP/USDT', 'YFI/USDT', 'MKR/USDT', 'SUSHI/USDT', 'CRV/USDT',

            // DeFi & Layer 2 - VERIFIED ACTIVE
            '1INCH/USDT', 'BAT/USDT', 'ZRX/USDT', 'LRC/USDT',
            'DYDX/USDT', 'ENS/USDT', 'FET/USDT', 'GALA/USDT', 'GMT/USDT',
            'JASMY/USDT', 'KSM/USDT', 'LDO/USDT', 'MASK/USDT', 'ONE/USDT',
            'QNT/USDT', 'ROSE/USDT', 'SKL/USDT', 'STX/USDT',
            'WOO/USDT', 'ZEC/USDT', 'ZEN/USDT', 'DASH/USDT',

            // Established Projects - VERIFIED ACTIVE
            'WAVES/USDT', 'ICX/USDT', 'QTUM/USDT', 'ONT/USDT',
            'CELO/USDT', 'AR/USDT', 'KDA/USDT', 'BLUR/USDT',
            'PEPE/USDT', 'FLR/USDT', 'CFX/USDT', 'RNDR/USDT',
            'WLD/USDT', 'TIA/USDT', 'BONK/USDT', 'MINA/USDT',
            'PENDLE/USDT', 'JTO/USDT', 'PYTH/USDT'
        ];
    }

    static getAllPairs(): { pair: string; marketType: MarketType }[] {
        const forexPairs = this.getForexPairs().map(pair => ({
            pair,
            marketType: MarketType.FOREX
        }));

        const cryptoPairs = this.getCryptoPairs().map(pair => ({
            pair,
            marketType: MarketType.CRYPTO
        }));

        return [...forexPairs, ...cryptoPairs];
    }

    static async getAllCryptoPrices(): Promise<Map<string, number>> {
        return await BinanceAPI.getAllCryptoPrices();
    }

    static async getAllMexcPrices(): Promise<Map<string, number>> {
        try {
            const mexcPrices = await MexcAPI.getAllCryptoPrices();

            if (mexcPrices.size === 0) {
                const binancePrices = await this.getAllCryptoPrices();
                const simulatedPrices = new Map<string, number>();

                binancePrices.forEach((price, symbol) => {
                    const spread = (Math.random() - 0.5) * 0.004;
                    simulatedPrices.set(symbol, price * (1 + spread));
                });

                return simulatedPrices;
            }

            return mexcPrices;
        } catch {
            try {
                const binancePrices = await this.getAllCryptoPrices();
                const simulatedPrices = new Map<string, number>();

                binancePrices.forEach((price, symbol) => {
                    const spread = (Math.random() - 0.5) * 0.004;
                    simulatedPrices.set(symbol, price * (1 + spread));
                });

                return simulatedPrices;
            } catch {
                return new Map<string, number>();
            }
        }
    }

    static updatePrice(marketData: MarketData): MarketData {
        const lastPrice = marketData.currentPrice;
        const change = (Math.random() - 0.5) * 0.005;
        const newPrice = lastPrice * (1 + change);

        return {
            ...marketData,
            currentPrice: newPrice,
            prices: [...marketData.prices.slice(1), newPrice],
            timestamps: [
                ...marketData.timestamps.slice(1),
                new Date()
            ]
        };
    }
}
