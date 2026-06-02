import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatPrice(price: number, maxDecimals: number = 2): string {
    // For very small prices (< $1), show more decimals
    if (price < 1) {
        return price.toFixed(Math.min(4, maxDecimals));
    }
    // For small prices ($1-$100), show 2-3 decimals
    else if (price < 100) {
        return price.toFixed(Math.min(3, maxDecimals));
    }
    // For medium prices ($100-$10,000), show up to maxDecimals
    else if (price < 10000) {
        return price.toFixed(Math.min(2, maxDecimals));
    }
    // For large prices (>$10,000), show with comma separators
    else {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: Math.min(2, maxDecimals),
            maximumFractionDigits: maxDecimals
        });
    }
}

export function formatPercentage(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

export function formatVolume(volume: number): string {
    if (volume >= 1000000000) {
        return `${(volume / 1000000000).toFixed(2)}B`;
    } else if (volume >= 1000000) {
        return `${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
        return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toFixed(2);
}

export function formatTimeAgo(date: Date | string): string {
    const now = new Date();
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if valid date
    if (isNaN(dateObj.getTime())) {
        return 'Unknown';
    }

    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}
