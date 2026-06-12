/**
 * MarketGPT Order Book Engine
 * 
 * A TypeScript discrete event simulator inspired by MarketGPT (Cornell University).
 * Generates realistic limit order book dynamics with Add, Cancel, and Execute events
 * matching NASDAQ ITCH 5.0 message format patterns.
 * 
 * Features:
 * - Price-time priority matching engine
 * - Log-normal order size distributions
 * - Mean-reverting mid-price with momentum
 * - Configurable volatility, spread, and order arrival rates
 * - Market event triggers (Flash Crash, Earnings, FOMC)
 */

// ─── Types ───────────────────────────────────────────────────────────

export type OrderSide = 'BID' | 'ASK';
export type EventType = 'ADD' | 'CANCEL' | 'EXECUTE';

export interface Order {
    id: string;
    side: OrderSide;
    price: number;
    quantity: number;
    timestamp: number;
}

export interface OrderEvent {
    id: string;
    type: EventType;
    side: OrderSide;
    price: number;
    quantity: number;
    timestamp: number;
    orderId: string;
}

export interface PriceLevel {
    price: number;
    quantity: number;
    orderCount: number;
}

export interface OrderBookSnapshot {
    bids: PriceLevel[];       // Sorted descending by price (best bid first)
    asks: PriceLevel[];       // Sorted ascending by price (best ask first)
    midPrice: number;
    spread: number;
    bestBid: number;
    bestAsk: number;
    lastTradePrice: number;
    lastTradeSide: OrderSide;
    totalBidVolume: number;
    totalAskVolume: number;
}

export interface MarketStatsData {
    midPrice: number;
    spread: number;
    spreadBps: number;        // Spread in basis points
    vwap: number;
    totalVolume: number;
    ordersPerSecond: number;
    bidAskRatio: number;
    priceHistory: number[];   // Last N mid prices for sparkline
    volatility: number;       // Realized volatility
    highPrice: number;
    lowPrice: number;
}

export interface SimulatorConfig {
    symbol: string;
    initialPrice: number;
    tickSize: number;
    volatility: number;       // 0-100 scale
    orderFrequency: number;   // 0-100 scale
    speed: number;            // Multiplier: 0.5, 1, 2, 5
    maxDepthLevels: number;
    maxOrdersPerLevel: number;
}

export type MarketEventType = 'FLASH_CRASH' | 'EARNINGS_SPIKE' | 'FOMC_VOLATILITY' | 'WHALE_BUY' | 'WHALE_SELL';

// ─── Constants ───────────────────────────────────────────────────────

const SYMBOLS: Record<string, number> = {
    'AAPL': 185.50,
    'TSLA': 178.20,
    'MSFT': 420.80,
    'NVDA': 135.60,
    'AMZN': 186.40,
    'GOOGL': 175.30,
    'META': 510.50,
    'BTC/USD': 104250.00,
    'ETH/USD': 2780.00,
    'SPY': 545.80,
};

const DEFAULT_CONFIG: SimulatorConfig = {
    symbol: 'AAPL',
    initialPrice: 185.50,
    tickSize: 0.01,
    volatility: 50,
    orderFrequency: 50,
    speed: 1,
    maxDepthLevels: 15,
    maxOrdersPerLevel: 50,
};

// ─── Engine ──────────────────────────────────────────────────────────

export class OrderBookEngine {
    private config: SimulatorConfig;
    private bids: Map<number, Order[]> = new Map();  // price -> orders
    private asks: Map<number, Order[]> = new Map();  // price -> orders
    private midPrice: number;
    private lastTradePrice: number;
    private lastTradeSide: OrderSide = 'BID';
    private orderIdCounter: number = 0;
    private eventLog: OrderEvent[] = [];
    private tradeLog: { price: number; quantity: number; timestamp: number; side: OrderSide }[] = [];
    private priceHistory: number[] = [];
    private startTime: number;
    private eventCount: number = 0;
    private momentum: number = 0;
    private isRunning: boolean = false;
    private highPrice: number;
    private lowPrice: number;

    constructor(config?: Partial<SimulatorConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (config?.symbol && SYMBOLS[config.symbol]) {
            this.config.initialPrice = SYMBOLS[config.symbol];
        }
        this.midPrice = this.config.initialPrice;
        this.lastTradePrice = this.config.initialPrice;
        this.highPrice = this.config.initialPrice;
        this.lowPrice = this.config.initialPrice;
        this.startTime = Date.now();
        this.initializeBook();
    }

    // ─── Public API ──────────────────────────────────────────────────

    static getSymbols(): Record<string, number> {
        return { ...SYMBOLS };
    }

    start(): void {
        this.isRunning = true;
    }

    stop(): void {
        this.isRunning = false;
    }

    reset(newConfig?: Partial<SimulatorConfig>): void {
        if (newConfig) {
            this.config = { ...this.config, ...newConfig };
            if (newConfig.symbol && SYMBOLS[newConfig.symbol]) {
                this.config.initialPrice = SYMBOLS[newConfig.symbol];
            }
        }
        this.bids.clear();
        this.asks.clear();
        this.midPrice = this.config.initialPrice;
        this.lastTradePrice = this.config.initialPrice;
        this.highPrice = this.config.initialPrice;
        this.lowPrice = this.config.initialPrice;
        this.orderIdCounter = 0;
        this.eventLog = [];
        this.tradeLog = [];
        this.priceHistory = [];
        this.momentum = 0;
        this.eventCount = 0;
        this.startTime = Date.now();
        this.initializeBook();
    }

    /**
     * Step the simulator forward by one tick.
     * Generates 1-5 order events depending on frequency setting.
     * Returns the new events generated.
     */
    tick(): OrderEvent[] {
        if (!this.isRunning) return [];

        const events: OrderEvent[] = [];

        // Number of events per tick scales with frequency
        const baseEvents = 1 + Math.floor((this.config.orderFrequency / 100) * 4);
        const numEvents = Math.max(1, baseEvents);

        for (let i = 0; i < numEvents; i++) {
            const event = this.generateEvent();
            if (event) {
                events.push(event);
                this.eventLog.push(event);
                this.eventCount++;
            }
        }

        // Update mid price with random walk
        this.updateMidPrice();

        // Record price history (keep last 200 for sparkline)
        this.priceHistory.push(this.midPrice);
        if (this.priceHistory.length > 200) {
            this.priceHistory.shift();
        }

        // Track high/low
        if (this.midPrice > this.highPrice) this.highPrice = this.midPrice;
        if (this.midPrice < this.lowPrice) this.lowPrice = this.midPrice;

        // Trim event log to last 500
        if (this.eventLog.length > 500) {
            this.eventLog = this.eventLog.slice(-500);
        }

        return events;
    }

    /**
     * Trigger a special market event
     */
    triggerMarketEvent(eventType: MarketEventType): OrderEvent[] {
        const events: OrderEvent[] = [];
        const now = Date.now();

        switch (eventType) {
            case 'FLASH_CRASH': {
                // Wipe 70% of bids, cascade executions
                const bidPrices = [...this.bids.keys()].sort((a, b) => b - a);
                const toRemove = Math.ceil(bidPrices.length * 0.7);
                for (let i = 0; i < toRemove && i < bidPrices.length; i++) {
                    const orders = this.bids.get(bidPrices[i]) || [];
                    for (const order of orders) {
                        events.push({
                            id: this.nextId(),
                            type: 'CANCEL',
                            side: 'BID',
                            price: order.price,
                            quantity: order.quantity,
                            timestamp: now,
                            orderId: order.id,
                        });
                    }
                    this.bids.delete(bidPrices[i]);
                }
                // Slam price down 2-5%
                const crashPct = 0.02 + Math.random() * 0.03;
                this.midPrice *= (1 - crashPct);
                this.momentum = -3;
                // Add aggressive sell orders
                for (let i = 0; i < 20; i++) {
                    const price = this.roundPrice(this.midPrice - this.config.tickSize * (i + 1));
                    const qty = Math.round(50 + Math.random() * 200);
                    const order: Order = { id: this.nextId(), side: 'ASK', price, quantity: qty, timestamp: now };
                    this.addToBook(order);
                    events.push({
                        id: this.nextId(),
                        type: 'ADD',
                        side: 'ASK',
                        price,
                        quantity: qty,
                        timestamp: now,
                        orderId: order.id,
                    });
                }
                break;
            }
            case 'EARNINGS_SPIKE': {
                // Gap up 3-7%, heavy volume both sides
                const spikePct = 0.03 + Math.random() * 0.04;
                this.midPrice *= (1 + spikePct);
                this.momentum = 4;
                // Clear existing book and rebuild at new level
                this.bids.clear();
                this.asks.clear();
                this.initializeBook();
                break;
            }
            case 'FOMC_VOLATILITY': {
                // Double-sided volatility spike
                this.momentum = (Math.random() > 0.5 ? 1 : -1) * 2;
                const fomcPct = (Math.random() - 0.5) * 0.04;
                this.midPrice *= (1 + fomcPct);
                // Widen spread by cancelling near-mid orders
                const spreadWiden = 5;
                for (let i = 0; i < spreadWiden; i++) {
                    const bidPrice = this.roundPrice(this.midPrice - this.config.tickSize * (i + 1));
                    const askPrice = this.roundPrice(this.midPrice + this.config.tickSize * (i + 1));
                    this.bids.delete(bidPrice);
                    this.asks.delete(askPrice);
                }
                break;
            }
            case 'WHALE_BUY': {
                // Massive buy order eats through asks
                const eatLevels = 8;
                const askPrices = [...this.asks.keys()].sort((a, b) => a - b);
                for (let i = 0; i < eatLevels && i < askPrices.length; i++) {
                    const orders = this.asks.get(askPrices[i]) || [];
                    for (const order of orders) {
                        events.push({
                            id: this.nextId(),
                            type: 'EXECUTE',
                            side: 'ASK',
                            price: order.price,
                            quantity: order.quantity,
                            timestamp: now,
                            orderId: order.id,
                        });
                        this.tradeLog.push({ price: order.price, quantity: order.quantity, timestamp: now, side: 'BID' });
                    }
                    this.asks.delete(askPrices[i]);
                }
                this.midPrice *= 1.01;
                this.momentum = 2;
                break;
            }
            case 'WHALE_SELL': {
                // Massive sell order eats through bids
                const eatBidLevels = 8;
                const bidPrices = [...this.bids.keys()].sort((a, b) => b - a);
                for (let i = 0; i < eatBidLevels && i < bidPrices.length; i++) {
                    const orders = this.bids.get(bidPrices[i]) || [];
                    for (const order of orders) {
                        events.push({
                            id: this.nextId(),
                            type: 'EXECUTE',
                            side: 'BID',
                            price: order.price,
                            quantity: order.quantity,
                            timestamp: now,
                            orderId: order.id,
                        });
                        this.tradeLog.push({ price: order.price, quantity: order.quantity, timestamp: now, side: 'ASK' });
                    }
                    this.bids.delete(bidPrices[i]);
                }
                this.midPrice *= 0.99;
                this.momentum = -2;
                break;
            }
        }

        return events;
    }

    /**
     * Get current order book snapshot
     */
    getSnapshot(): OrderBookSnapshot {
        const bids = this.aggregateSide(this.bids, 'desc');
        const asks = this.aggregateSide(this.asks, 'asc');

        const bestBid = bids.length > 0 ? bids[0].price : this.midPrice - this.config.tickSize;
        const bestAsk = asks.length > 0 ? asks[0].price : this.midPrice + this.config.tickSize;

        return {
            bids: bids.slice(0, this.config.maxDepthLevels),
            asks: asks.slice(0, this.config.maxDepthLevels),
            midPrice: this.midPrice,
            spread: bestAsk - bestBid,
            bestBid,
            bestAsk,
            lastTradePrice: this.lastTradePrice,
            lastTradeSide: this.lastTradeSide,
            totalBidVolume: bids.reduce((sum, l) => sum + l.quantity, 0),
            totalAskVolume: asks.reduce((sum, l) => sum + l.quantity, 0),
        };
    }

    /**
     * Get recent events for the order flow stream
     */
    getRecentEvents(count: number = 50): OrderEvent[] {
        return this.eventLog.slice(-count);
    }

    /**
     * Get market statistics
     */
    getStats(): MarketStatsData {
        const snapshot = this.getSnapshot();
        const elapsedSec = Math.max(1, (Date.now() - this.startTime) / 1000);

        // Calculate VWAP from trade log
        let vwap = this.midPrice;
        if (this.tradeLog.length > 0) {
            const recentTrades = this.tradeLog.slice(-100);
            const totalPriceVol = recentTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);
            const totalVol = recentTrades.reduce((sum, t) => sum + t.quantity, 0);
            vwap = totalVol > 0 ? totalPriceVol / totalVol : this.midPrice;
        }

        // Calculate realized volatility from price history
        let volatility = 0;
        if (this.priceHistory.length > 10) {
            const returns: number[] = [];
            for (let i = 1; i < this.priceHistory.length; i++) {
                if (this.priceHistory[i - 1] > 0) {
                    returns.push(Math.log(this.priceHistory[i] / this.priceHistory[i - 1]));
                }
            }
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
            volatility = Math.sqrt(variance) * 100; // As percentage
        }

        return {
            midPrice: this.midPrice,
            spread: snapshot.spread,
            spreadBps: (snapshot.spread / this.midPrice) * 10000,
            vwap,
            totalVolume: this.tradeLog.reduce((sum, t) => sum + t.quantity, 0),
            ordersPerSecond: this.eventCount / elapsedSec,
            bidAskRatio: snapshot.totalBidVolume / Math.max(1, snapshot.totalAskVolume),
            priceHistory: [...this.priceHistory],
            volatility,
            highPrice: this.highPrice,
            lowPrice: this.lowPrice,
        };
    }

    getConfig(): SimulatorConfig {
        return { ...this.config };
    }

    updateConfig(partial: Partial<SimulatorConfig>): void {
        const symbolChanged = partial.symbol && partial.symbol !== this.config.symbol;
        this.config = { ...this.config, ...partial };
        if (symbolChanged && partial.symbol && SYMBOLS[partial.symbol]) {
            this.reset({ symbol: partial.symbol });
        }
    }

    // ─── Private Methods ─────────────────────────────────────────────

    private initializeBook(): void {
        const { maxDepthLevels, tickSize } = this.config;
        const now = Date.now();

        // Seed the book with realistic order distribution
        for (let i = 1; i <= maxDepthLevels; i++) {
            const bidPrice = this.roundPrice(this.midPrice - tickSize * i);
            const askPrice = this.roundPrice(this.midPrice + tickSize * i);

            // More volume near the mid, less further out (exponential decay)
            const depthFactor = Math.exp(-0.15 * i);
            const baseQty = 20 + Math.floor(Math.random() * 80);
            const bidQty = Math.round(baseQty * depthFactor * (1 + Math.random()));
            const askQty = Math.round(baseQty * depthFactor * (1 + Math.random()));

            // Create 1-3 orders per level
            const numBidOrders = 1 + Math.floor(Math.random() * 3);
            const numAskOrders = 1 + Math.floor(Math.random() * 3);

            for (let j = 0; j < numBidOrders; j++) {
                const qty = Math.max(1, Math.round(bidQty / numBidOrders + (Math.random() - 0.5) * 10));
                this.addToBook({ id: this.nextId(), side: 'BID', price: bidPrice, quantity: qty, timestamp: now });
            }
            for (let j = 0; j < numAskOrders; j++) {
                const qty = Math.max(1, Math.round(askQty / numAskOrders + (Math.random() - 0.5) * 10));
                this.addToBook({ id: this.nextId(), side: 'ASK', price: askPrice, quantity: qty, timestamp: now });
            }
        }
    }

    private generateEvent(): OrderEvent | null {
        const now = Date.now();
        const rand = Math.random();

        // Event probabilities:
        // ADD: 55%, CANCEL: 25%, EXECUTE: 20%
        if (rand < 0.55) {
            return this.generateAddEvent(now);
        } else if (rand < 0.80) {
            return this.generateCancelEvent(now);
        } else {
            return this.generateExecuteEvent(now);
        }
    }

    private generateAddEvent(timestamp: number): OrderEvent {
        const side: OrderSide = Math.random() > 0.5 ? 'BID' : 'ASK';

        // Price placement: mostly near mid, sometimes further out
        const distFromMid = this.logNormalSample(1, 0.8);
        const ticks = Math.max(1, Math.round(distFromMid));

        const price = side === 'BID'
            ? this.roundPrice(this.midPrice - this.config.tickSize * ticks)
            : this.roundPrice(this.midPrice + this.config.tickSize * ticks);

        // Quantity: log-normal distribution
        const quantity = Math.max(1, Math.round(this.logNormalSample(3, 1.2)));

        const order: Order = { id: this.nextId(), side, price, quantity, timestamp };
        this.addToBook(order);

        return {
            id: this.nextId(),
            type: 'ADD',
            side,
            price,
            quantity,
            timestamp,
            orderId: order.id,
        };
    }

    private generateCancelEvent(timestamp: number): OrderEvent | null {
        // Pick a random side to cancel from
        const side: OrderSide = Math.random() > 0.5 ? 'BID' : 'ASK';
        const book = side === 'BID' ? this.bids : this.asks;

        if (book.size === 0) return this.generateAddEvent(timestamp); // Fallback to add

        // Prefer cancelling from levels further from mid
        const prices = [...book.keys()];
        const idx = Math.min(prices.length - 1, Math.floor(Math.random() * Math.random() * prices.length));
        const priceLevel = side === 'BID'
            ? prices.sort((a, b) => b - a)[idx]  // worst bids first
            : prices.sort((a, b) => a - b)[idx]; // worst asks first

        // For cancel, sort in reverse so worst levels are cancelled first
        const sortedPrices = side === 'BID'
            ? prices.sort((a, b) => a - b)  // lowest bid = worst
            : prices.sort((a, b) => b - a); // highest ask = worst

        const targetPrice = sortedPrices[Math.min(idx, sortedPrices.length - 1)];
        const orders = book.get(targetPrice);
        if (!orders || orders.length === 0) return this.generateAddEvent(timestamp);

        const orderIdx = Math.floor(Math.random() * orders.length);
        const order = orders[orderIdx];
        orders.splice(orderIdx, 1);
        if (orders.length === 0) book.delete(targetPrice);

        return {
            id: this.nextId(),
            type: 'CANCEL',
            side,
            price: order.price,
            quantity: order.quantity,
            timestamp,
            orderId: order.id,
        };
    }

    private generateExecuteEvent(timestamp: number): OrderEvent | null {
        // Market order execution — aggressive order eats best level
        const side: OrderSide = Math.random() > 0.5 ? 'BID' : 'ASK';
        const book = side === 'BID' ? this.bids : this.asks;

        if (book.size === 0) return this.generateAddEvent(timestamp);

        // Get best price level
        const prices = [...book.keys()];
        const bestPrice = side === 'BID'
            ? Math.max(...prices)
            : Math.min(...prices);

        const orders = book.get(bestPrice);
        if (!orders || orders.length === 0) return this.generateAddEvent(timestamp);

        // Execute the first order at this level (price-time priority)
        const order = orders.shift()!;
        if (orders.length === 0) book.delete(bestPrice);

        // Partial or full fill
        const fillQty = Math.random() > 0.3
            ? order.quantity  // Full fill (70%)
            : Math.max(1, Math.floor(order.quantity * Math.random()));  // Partial fill (30%)

        // Record trade
        this.lastTradePrice = order.price;
        this.lastTradeSide = side === 'BID' ? 'ASK' : 'BID'; // Aggressor side
        this.tradeLog.push({ price: order.price, quantity: fillQty, timestamp, side: this.lastTradeSide });

        // Keep trade log manageable
        if (this.tradeLog.length > 1000) {
            this.tradeLog = this.tradeLog.slice(-500);
        }

        // If partial fill, put remainder back
        if (fillQty < order.quantity) {
            const remainder: Order = { ...order, quantity: order.quantity - fillQty };
            if (!book.has(bestPrice)) book.set(bestPrice, []);
            book.get(bestPrice)!.unshift(remainder);
        }

        return {
            id: this.nextId(),
            type: 'EXECUTE',
            side,
            price: order.price,
            quantity: fillQty,
            timestamp,
            orderId: order.id,
        };
    }

    private updateMidPrice(): void {
        const { volatility, tickSize } = this.config;
        const volFactor = volatility / 100;

        // Mean-reverting random walk with momentum
        const noise = (Math.random() - 0.5) * 2 * volFactor * tickSize * 3;
        const meanReversion = -this.momentum * 0.05 * tickSize;

        // Momentum decay
        this.momentum *= 0.98;
        this.momentum += noise * 10;
        this.momentum = Math.max(-5, Math.min(5, this.momentum));

        this.midPrice += noise + meanReversion;
        this.midPrice = Math.max(this.config.tickSize * 10, this.midPrice); // Floor

        // Ensure book doesn't get too thin — replenish if needed
        this.replenishBook();
    }

    private replenishBook(): void {
        const bidCount = this.bids.size;
        const askCount = this.asks.size;
        const now = Date.now();
        const minLevels = Math.max(5, this.config.maxDepthLevels - 5);

        if (bidCount < minLevels) {
            for (let i = bidCount + 1; i <= this.config.maxDepthLevels; i++) {
                const price = this.roundPrice(this.midPrice - this.config.tickSize * i);
                if (!this.bids.has(price)) {
                    const qty = Math.max(1, Math.round(this.logNormalSample(3, 1)));
                    this.addToBook({ id: this.nextId(), side: 'BID', price, quantity: qty, timestamp: now });
                }
            }
        }

        if (askCount < minLevels) {
            for (let i = askCount + 1; i <= this.config.maxDepthLevels; i++) {
                const price = this.roundPrice(this.midPrice + this.config.tickSize * i);
                if (!this.asks.has(price)) {
                    const qty = Math.max(1, Math.round(this.logNormalSample(3, 1)));
                    this.addToBook({ id: this.nextId(), side: 'ASK', price, quantity: qty, timestamp: now });
                }
            }
        }
    }

    private addToBook(order: Order): void {
        const book = order.side === 'BID' ? this.bids : this.asks;
        if (!book.has(order.price)) {
            book.set(order.price, []);
        }
        const level = book.get(order.price)!;
        if (level.length < this.config.maxOrdersPerLevel) {
            level.push(order);
        }
    }

    private aggregateSide(book: Map<number, Order[]>, sort: 'asc' | 'desc'): PriceLevel[] {
        const levels: PriceLevel[] = [];
        for (const [price, orders] of book) {
            const totalQty = orders.reduce((sum, o) => sum + o.quantity, 0);
            if (totalQty > 0) {
                levels.push({ price, quantity: totalQty, orderCount: orders.length });
            }
        }
        levels.sort((a, b) => sort === 'asc' ? a.price - b.price : b.price - a.price);
        return levels;
    }

    private roundPrice(price: number): number {
        const { tickSize } = this.config;
        return Math.round(price / tickSize) * tickSize;
    }

    private nextId(): string {
        return `ORD-${++this.orderIdCounter}`;
    }

    /**
     * Log-normal distribution sample
     * Good for modelling order sizes and distances
     */
    private logNormalSample(mu: number, sigma: number): number {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.exp(mu + sigma * z);
    }
}
