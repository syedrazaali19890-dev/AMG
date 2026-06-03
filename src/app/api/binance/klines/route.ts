import { NextResponse } from 'next/server';

// Cache klines for 60 seconds (1h candles don't change that fast)
const klinesCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_DURATION = 60 * 1000; // 60 seconds

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const interval = searchParams.get('interval') || '1h';
        const limit = searchParams.get('limit') || '100';
        const isFuture = searchParams.get('future') === 'true';

        if (!symbol) {
            return NextResponse.json(
                { error: 'Symbol parameter is required' },
                { status: 400 }
            );
        }

        // Check cache
        const cacheKey = `${symbol}-${interval}-${limit}-${isFuture}`;
        const cached = klinesCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return NextResponse.json({
                klines: cached.data,
                cached: true,
                timestamp: cached.timestamp
            });
        }

        // Fetch from Binance (server-side, no CORS)
        const baseUrl = isFuture
            ? 'https://fapi.binance.com/fapi/v1'
            : 'https://api.binance.com/api/v3';

        const response = await fetch(
            `${baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();

        // Update cache
        klinesCache.set(cacheKey, { data, timestamp: Date.now() });

        return NextResponse.json({
            klines: data,
            cached: false,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Klines fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch klines data' },
            { status: 500 }
        );
    }
}
