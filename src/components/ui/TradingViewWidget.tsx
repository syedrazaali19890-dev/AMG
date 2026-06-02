'use client';

import { memo } from 'react';

interface TradingViewWidgetProps {
    symbol: string;
    theme?: 'light' | 'dark';
    interval?: string;
    height?: number;
    isFuture?: boolean;
}

export const TradingViewWidget = memo(function TradingViewWidget({ 
    symbol, 
    theme = 'dark', 
    interval = '60',
    height = 400,
    isFuture = false
}: TradingViewWidgetProps) {
    // Format symbol for TradingView (e.g., BTC/USDT -> BINANCE:BTCUSDT or BINANCE:BTCUSDT.P)
    const cleanSymbol = symbol.replace('/', '');
    const tvSymbol = `BINANCE:${cleanSymbol}${isFuture ? '.P' : ''}`;
    
    // Using TradingView Advanced Chart Widget iframe for stability in React
    // This avoids script loading issues and provides the full TV experience
    const src = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${tvSymbol}&interval=${interval}&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=F1F3F6&studies=[]&theme=${theme}&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en`;

    return (
        <div 
            className="w-full rounded-lg overflow-hidden border-2 border-border/50 bg-background/50 backdrop-blur-sm"
            style={{ height: `${height}px` }}
        >
            <iframe
                title={`TradingView Chart - ${symbol}`}
                src={src}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                scrolling="no"
                allowFullScreen={true}
            />
        </div>
    );
});
