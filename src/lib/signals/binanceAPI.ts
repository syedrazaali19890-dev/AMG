// Binance API Integration for Real-Time Crypto Prices

export interface BinanceTickerPrice {
    symbol: string;
    price: string;
}

export interface BinanceTicker24h {
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    weightedAvgPrice: string;
    prevClosePrice: string;
    lastPrice: string;
    lastQty: string;
    bidPrice: string;
    askPrice: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    openTime: number;
    closeTime: number;
    count: number;
}

export class BinanceAPI {
    private static readonly BASE_URL = 'https://api.binance.com/api/v3';

    /**
     * Get current price for a single symbol
     */
    static async getCurrentPrice(symbol: string): Promise<number> {
        try {
            const response = await fetch(`${this.BASE_URL}/ticker/price?symbol=${symbol}`);

            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }

            const data: BinanceTickerPrice = await response.json();
            return parseFloat(data.price);
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get current prices for multiple symbols
     */
    static async getMultiplePrices(symbols: string[], isFuture: boolean = false): Promise<Map<string, number>> {
        try {
            const baseUrl = isFuture ? 'https://fapi.binance.com/fapi/v1' : this.BASE_URL;
            const response = await fetch(`${baseUrl}/ticker/price`);

            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }

            const data: BinanceTickerPrice[] = await response.json();
            const priceMap = new Map<string, number>();

            // Filter for requested symbols (if empty, return all)
            for (const ticker of data) {
                if (symbols.length === 0 || symbols.includes(ticker.symbol)) {
                    priceMap.set(ticker.symbol, parseFloat(ticker.price));
                }
            }

            return priceMap;
        } catch (error) {
            console.error('Error fetching multiple prices:', error);
            throw error;
        }
    }

    /**
     * Get 24h ticker data for a symbol (includes volume, high, low, etc.)
     */
    static async get24hTicker(symbol: string): Promise<BinanceTicker24h> {
        try {
            const response = await fetch(`${this.BASE_URL}/ticker/24hr?symbol=${symbol}`);

            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }

            const data: BinanceTicker24h = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching 24h ticker for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get historical klines/candlestick data
     */
    static async getKlines(
        symbol: string,
        interval: string = '1h',
        limit: number = 100,
        isFuture: boolean = false
    ): Promise<number[][]> {
        try {
            const baseUrl = isFuture ? 'https://fapi.binance.com/fapi/v1' : this.BASE_URL;
            const response = await fetch(
                `${baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
            );

            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            // CORS error is expected when calling Binance from browser
            // App automatically falls back to high-quality simulated data
            // Only show friendly message in development, not scary errors
            if (process.env.NODE_ENV === 'development') {
                console.info(`📊 Binance API unavailable for ${symbol} (browser CORS restriction) - using simulated data`);
            }
            throw error; // Re-throw for fallback mechanism in marketData.ts
        }
    }

    /**
     * Convert our pair format to Binance symbol format
     * BTC/USDT -> BTCUSDT
     */
    static pairToBinanceSymbol(pair: string): string {
        return pair.replace('/', '');
    }

    /**
     * Convert Binance symbol to our pair format
     * BTCUSDT -> BTC/USDT
     */
    static binanceSymbolToPair(symbol: string): string {
        // Assume all symbols end with USDT for crypto
        if (symbol.endsWith('USDT')) {
            const base = symbol.slice(0, -4);
            return `${base}/USDT`;
        }
        return symbol;
    }

    /**
     * Get real-time prices for all our crypto pairs
     */
    static async getAllCryptoPrices(isFuture: boolean = false): Promise<Map<string, number>> {
        // Fetch ALL USDT pairs by passing an empty array
        const allPrices = await this.getMultiplePrices([], isFuture);
        const usdtPrices = new Map<string, number>();

        // Exclude fiat and stablecoin base pairs
        const excludedBases = ['USDC', 'FDUSD', 'TUSD', 'BUSD', 'USDP', 'EUR', 'GBP', 'TRY', 'RUB', 'BRL', 'ZAR', 'UAH', 'ARS', 'RON'];

        allPrices.forEach((price, symbol) => {
            // Only allow standard English alphanumeric uppercase symbols (A-Z and 0-9)
            const isStandardSymbol = /^[A-Z0-9]+USDT$/.test(symbol);
            const isExcluded = excludedBases.some(base => symbol === `${base}USDT`);

            if (isStandardSymbol && !isExcluded && !symbol.includes('UP') && !symbol.includes('DOWN') && !symbol.includes('BULL') && !symbol.includes('BEAR')) {
                usdtPrices.set(symbol, price);
            }
        });

        return usdtPrices;
    }

    /**
     * Get all active USDT pairs dynamically from Binance
     */
    static async getAllUSDTPairs(isFuture: boolean = false): Promise<string[]> {
        try {
            const prices = await this.getAllCryptoPrices(isFuture);
            return Array.from(prices.keys()).map(symbol => this.binanceSymbolToPair(symbol));
        } catch (error) {
            console.error('Failed to fetch all USDT pairs from Binance', error);
            // Return a fallback list
            return ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT'];
        }
    }

    /**
     * Get market data with real prices and historical data
     */
    static async getMarketDataWithRealPrices(pair: string, isFuture: boolean = false): Promise<{
        currentPrice: number;
        prices: number[];
        volumes: number[];
        timestamps: Date[];
    }> {
        try {
            const symbol = this.pairToBinanceSymbol(pair);

            // Get historical klines (100 hours of data)
            const klines = await this.getKlines(symbol, '1h', 100, isFuture);

            const prices: number[] = [];
            const volumes: number[] = [];
            const timestamps: Date[] = [];

            for (const kline of klines) {
                const closePrice = parseFloat(String(kline[4])); // Close price
                const volume = parseFloat(String(kline[5])); // Volume
                const timestamp = new Date(kline[0]); // Open time

                prices.push(closePrice);
                volumes.push(volume);
                timestamps.push(timestamp);
            }

            const currentPrice = prices[prices.length - 1];

            return {
                currentPrice,
                prices,
                volumes,
                timestamps
            };
        } catch (error) {
            // Silently fall back - marketData.ts handles this gracefully
            throw error;
        }
    }

    /**
     * Get scalping market data with real prices (5-minute candles)
     * Optimized for short-term scalping signals
     */
    static async getScalpingMarketData(pair: string, isFuture: boolean = false): Promise<{
        currentPrice: number;
        prices: number[];
        volumes: number[];
        highs: number[];
        lows: number[];
        timestamps: Date[];
    }> {
        try {
            const symbol = this.pairToBinanceSymbol(pair);

            // Get 5-minute klines (48 candles = 4 hours of data for scalping)
            const klines = await this.getKlines(symbol, '5m', 48, isFuture);

            const prices: number[] = [];
            const volumes: number[] = [];
            const highs: number[] = [];
            const lows: number[] = [];
            const timestamps: Date[] = [];

            for (const kline of klines) {
                const closePrice = parseFloat(String(kline[4])); // Close price
                const volume = parseFloat(String(kline[5])); // Volume
                const highPrice = parseFloat(String(kline[2])); // High price
                const lowPrice = parseFloat(String(kline[3])); // Low price
                const timestamp = new Date(kline[0]); // Open time

                prices.push(closePrice);
                volumes.push(volume);
                highs.push(highPrice);
                lows.push(lowPrice);
                timestamps.push(timestamp);
            }

            const currentPrice = prices[prices.length - 1];

            return {
                currentPrice,
                prices,
                volumes,
                highs,
                lows,
                timestamps
            };
        } catch (error) {
            // Silently fall back - scalpingMarketData.ts handles this gracefully
            throw error;
        }
    }
}
