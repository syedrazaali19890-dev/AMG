import { Signal, SignalType, MarketType } from '../signals/types';
import { SignalManager } from './signalManager';
import { SignalGenerator } from '../signals/generator';
import { ScalpingSignalGenerator } from '../signals/scalpingGenerator';
import { OnChainSignalGenerator } from '../signals/onChainGenerator';
import { MarketDataManager } from '../signals/marketData';
import { BinanceAPI } from '../signals/binanceAPI';

/**
 * Auto Generator Service
 * Automatically generates signals on a schedule
 */

export interface GenerationConfig {
    market: 'CRYPTO' | 'FOREX';
    signalType: 'SPOT' | 'FUTURE';
    enabled: boolean;
}

export class AutoGenerator {
    private static intervals: Record<string, NodeJS.Timeout> = {};
    private static configs: Record<string, GenerationConfig> = {};

    // Generation intervals (in milliseconds)
    private static readonly INTERVALS = {
        standard: 10 * 60 * 1000,  // 10 minutes
        scalping: 5 * 60 * 1000,   // 5 minutes
        onchain: 15 * 60 * 1000    // 15 minutes
    };

    /**
     * Start auto-generation for a specific signal type
     */
    static startAutoGeneration(
        type: 'standard' | 'scalping' | 'onchain',
        config: GenerationConfig
    ): void {
        // Stop existing interval if any
        this.stopAutoGeneration(type);

        // Save config
        this.configs[type] = config;

        console.log(`🤖 Starting auto-generation for ${type} (every ${this.INTERVALS[type] / 60000} mins)`);

        // IMPORTANT: Set timestamp BEFORE generating to avoid timer showing 0
        // This ensures the countdown timer always has a valid timestamp
        SignalManager.updateLastGenerated(type);

        // Generate immediately
        this.generateSignals(type, config);

        // Then schedule periodic generation
        this.intervals[type] = setInterval(() => {
            SignalManager.updateLastGenerated(type);
            this.generateSignals(type, config);
        }, this.INTERVALS[type]);

        // Save to preferences
        const prefs = SignalManager.getAutoGenPreferences();
        prefs[type].enabled = true;
        SignalManager.setAutoGenPreferences(prefs);
    }

    /**
     * Stop auto-generation for a specific type
     */
    static stopAutoGeneration(type: 'standard' | 'scalping' | 'onchain'): void {
        if (this.intervals[type]) {
            clearInterval(this.intervals[type]);
            delete this.intervals[type];
            console.log(`⏸️ Stopped auto-generation for ${type}`);
        }

        // Update preferences
        const prefs = SignalManager.getAutoGenPreferences();
        prefs[type].enabled = false;
        SignalManager.setAutoGenPreferences(prefs);
    }

    /**
     * Stop all auto-generation
     */
    static stopAll(): void {
        Object.keys(this.intervals).forEach(type => {
            this.stopAutoGeneration(type as any);
        });
    }

    /**
     * Generate signals based on type and config
     */
    private static async generateSignals(
        type: 'standard' | 'scalping' | 'onchain',
        config: GenerationConfig
    ): Promise<void> {
        try {
            console.log(`🔄 Auto-generating ${type} signals...`);

            let generatedSignals: Signal[] = [];

            switch (type) {
                case 'standard':
                    generatedSignals = await this.generateStandardSignals(config);
                    break;

                case 'scalping':
                    generatedSignals = await this.generateScalpingSignals(config);
                    break;

                case 'onchain':
                    generatedSignals = await this.generateOnChainSignals();
                    break;
            }

            if (generatedSignals.length > 0) {
                // Replace old signals with new ones
                SignalManager.setActiveSignals(generatedSignals, type);

                console.log(`✅ Auto-generated ${generatedSignals.length} ${type} signals`);

                // Show notification
                this.showNotification(type, generatedSignals.length);
            } else {
                console.log(`⚠️ No ${type} signals generated`);
            }
        } catch (error) {
            console.error(`Error auto-generating ${type} signals:`, error);
        }
    }

    /**
     * Generate standard signals
     */
    private static async generateStandardSignals(config: GenerationConfig): Promise<Signal[]> {
        let filteredPairs: { pair: string; marketType: MarketType }[] = [];

        if (config.market === 'CRYPTO') {
            // Dynamically fetch ALL active crypto pairs from Binance (including all altcoins)
            const isFuture = config.signalType === 'FUTURE';
            const allCryptoPairs = await BinanceAPI.getAllUSDTPairs(isFuture);
            filteredPairs = allCryptoPairs.map(pair => ({ pair, marketType: MarketType.CRYPTO }));
        } else {
            const allPairs = MarketDataManager.getAllPairs();
            filteredPairs = allPairs.filter(({ marketType }) => marketType === MarketType.FOREX);
        }

        const signalType = config.signalType === 'SPOT' ? SignalType.SPOT : SignalType.FUTURE;

        // Generate signals for each pair
        const signals: Signal[] = [];
        for (const { pair, marketType } of filteredPairs) {
            try {
                const marketData = await MarketDataManager.generateMarketData(pair, marketType, 100, signalType);
                const signal = await SignalGenerator.generateSignal(marketData, signalType);
                if (signal) {
                    signals.push(signal);
                }
            } catch (error) {
                // Continue with other pairs
                console.debug(`Error generating signal for ${pair}:`, error);
            }
        }

        return signals;
    }

    /**
     * Generate scalping signals
     */
    private static async generateScalpingSignals(config: GenerationConfig): Promise<Signal[]> {
        let filteredPairs: { pair: string; marketType: MarketType }[] = [];

        if (config.market === 'CRYPTO') {
            // Dynamically fetch ALL active crypto pairs from Binance (including all altcoins)
            const isFuture = config.signalType === 'FUTURE';
            const allCryptoPairs = await BinanceAPI.getAllUSDTPairs(isFuture);
            filteredPairs = allCryptoPairs.map(pair => ({ pair, marketType: MarketType.CRYPTO }));
        } else {
            const allPairs = MarketDataManager.getAllPairs();
            filteredPairs = allPairs.filter(({ marketType }) => marketType === MarketType.FOREX);
        }

        // For scalping, take a random subset to prevent overloading
        filteredPairs = filteredPairs.sort(() => Math.random() - 0.5).slice(0, 40);

        const signalType = config.signalType === 'SPOT' ? SignalType.SPOT : SignalType.FUTURE;

        return await ScalpingSignalGenerator.generateScalpingSignals(filteredPairs, signalType);
    }

    /**
     * Generate on-chain signals
     */
    private static async generateOnChainSignals(): Promise<Signal[]> {
        return await OnChainSignalGenerator.generateOnChainSignals();
    }

    /**
     * Show notification for new signals
     */
    private static showNotification(type: string, count: number): void {
        if (typeof window === 'undefined') return;

        if (Notification.permission === 'granted') {
            try {
                const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
                new Notification(`🤖 Auto-Generated Signals`, {
                    body: `${count} new ${typeLabel} signals available`,
                    icon: '/favicon.ico',
                    tag: `autogen-${type}`
                });
            } catch (error) {
                console.debug('Notification error:', error);
            }
        }
    }

    /**
     * Check if auto-generation is enabled for type
     */
    static isEnabled(type: 'standard' | 'scalping' | 'onchain'): boolean {
        const prefs = SignalManager.getAutoGenPreferences();
        return prefs[type].enabled;
    }

    /**
     * Get time until next generation (in seconds)
     */
    static timeUntilNext(type: 'standard' | 'scalping' | 'onchain'): number {
        const prefs = SignalManager.getAutoGenPreferences();
        const lastGen = prefs[type].lastGenerated;
        if (lastGen === 0) return 0;

        const elapsed = Date.now() - lastGen;
        const interval = this.INTERVALS[type];
        const remaining = interval - elapsed;

        return Math.max(0, Math.floor(remaining / 1000));
    }

    /**
     * Resume auto-generation from saved preferences
     */
    static resumeFromPreferences(): void {
        const prefs = SignalManager.getAutoGenPreferences();

        (['standard', 'scalping', 'onchain'] as const).forEach(type => {
            if (prefs[type].enabled && this.configs[type]) {
                this.startAutoGeneration(type, this.configs[type]);
            }
        });
    }
}
