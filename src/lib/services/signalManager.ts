import { Signal, SignalStatus } from '../signals/types';

/**
 * Signal Manager Service
 * Central service for managing all signals across the application
 */

export interface ActiveSignals {
    standard: Signal[];
    scalping: Signal[];
    onchain: Signal[];
}

export interface AutoGenerationConfig {
    enabled: boolean;
    lastGenerated: number;
}

export interface AutoGenerationPreferences {
    standard: AutoGenerationConfig;
    scalping: AutoGenerationConfig;
    onchain: AutoGenerationConfig;
}

export class SignalManager {
    private static readonly ACTIVE_SIGNALS_KEY = 'activeSignals';
    private static readonly COMPLETED_SIGNALS_KEY = 'completedSignals';
    private static readonly AUTO_GEN_KEY = 'autoGenerationPrefs';

    /**
     * Get all active signals or by type
     */
    static getActiveSignals(type?: 'standard' | 'scalping' | 'onchain'): Signal[] {
        try {
            const stored = localStorage.getItem(this.ACTIVE_SIGNALS_KEY);
            if (!stored) return [];

            const allSignals: ActiveSignals = JSON.parse(stored);

            // Ensure structure is valid
            if (!allSignals || typeof allSignals !== 'object') {
                return [];
            }

            let signals: Signal[] = [];
            if (type) {
                signals = Array.isArray(allSignals[type]) ? allSignals[type] : [];
            } else {
                // Return all signals
                signals = [
                    ...(Array.isArray(allSignals.standard) ? allSignals.standard : []),
                    ...(Array.isArray(allSignals.scalping) ? allSignals.scalping : []),
                    ...(Array.isArray(allSignals.onchain) ? allSignals.onchain : [])
                ];
            }

            // Return empty if no signals
            if (!signals || signals.length === 0) {
                return [];
            }

            // IMPORTANT: Return fresh array with reconstructed Date objects
            // This ensures React detects changes when prices update
            return signals.map(signal => ({
                ...signal,
                timestamp: new Date(signal.timestamp),
                expiresAt: signal.expiresAt ? new Date(signal.expiresAt) : undefined,
                tp1HitTime: signal.tp1HitTime ? new Date(signal.tp1HitTime) : undefined,
                tp2HitTime: signal.tp2HitTime ? new Date(signal.tp2HitTime) : undefined,
                tp3HitTime: signal.tp3HitTime ? new Date(signal.tp3HitTime) : undefined,
            }));
        } catch (error) {
            console.error('Error loading active signals:', error);
            return [];
        }
    }

    /**
     * Set active signals for a specific type
     */
    static setActiveSignals(signals: Signal[], type: 'standard' | 'scalping' | 'onchain'): void {
        try {
            const stored = localStorage.getItem(this.ACTIVE_SIGNALS_KEY);
            const allSignals: ActiveSignals = stored
                ? JSON.parse(stored)
                : { standard: [], scalping: [], onchain: [] };

            allSignals[type] = signals;

            localStorage.setItem(this.ACTIVE_SIGNALS_KEY, JSON.stringify(allSignals));
        } catch (error) {
            console.error('Error saving active signals:', error);
        }
    }

    /**
     * Add new signals to existing ones
     */
    static addSignals(signals: Signal[], type: 'standard' | 'scalping' | 'onchain'): void {
        const existing = this.getActiveSignals(type);
        const combined = [...existing, ...signals];
        this.setActiveSignals(combined, type);
    }

    /**
     * Update a single signal
     */
    static updateSignal(updatedSignal: Signal, type: 'standard' | 'scalping' | 'onchain'): void {
        const signals = this.getActiveSignals(type);
        const index = signals.findIndex(s => s.id === updatedSignal.id);

        if (index !== -1) {
            signals[index] = updatedSignal;
            this.setActiveSignals(signals, type);
        }
    }

    /**
     * Complete a signal and move to completed signals
     */
    static completeSignal(signalId: string, type: 'standard' | 'scalping' | 'onchain'): void {
        const signals = this.getActiveSignals(type);
        const signalIndex = signals.findIndex(s => s.id === signalId);

        if (signalIndex === -1) return;

        const signal = signals[signalIndex];
        signal.status = SignalStatus.COMPLETED;

        // Recalculate profit based on which TP was hit
        const isLong = signal.direction === 'LONG' || signal.direction === 'BUY';
        let finalPrice = signal.currentPrice;

        // Use TP3 price if hit, otherwise TP2 price
        if (signal.tp3Hit && signal.takeProfit3) {
            finalPrice = signal.takeProfit3;
        } else if (signal.tp2Hit && signal.takeProfit2) {
            finalPrice = signal.takeProfit2;
        }

        // Recalculate profit based on actual TP level hit
        const finalProfit = isLong
            ? ((finalPrice - signal.entryPrice) / signal.entryPrice) * 100
            : ((signal.entryPrice - finalPrice) / signal.entryPrice) * 100;

        // Add to completed signals with corrected profit
        const completed = this.getCompletedSignals();
        completed.push({
            ...signal,
            profitLossPercentage: finalProfit, // Use corrected profit
            completedAt: new Date().toISOString(),
            isScalping: type === 'scalping',
            isOnChain: type === 'onchain'
        });

        localStorage.setItem(this.COMPLETED_SIGNALS_KEY, JSON.stringify(completed));

        // Remove from active signals
        signals.splice(signalIndex, 1);
        this.setActiveSignals(signals, type);
    }

    /**
     * Stop a signal (Stop Loss hit) and move to completed/stopped signals
     */
    static stopSignal(signalId: string, type: 'standard' | 'scalping' | 'onchain'): void {
        const signals = this.getActiveSignals(type);
        const signalIndex = signals.findIndex(s => s.id === signalId);

        if (signalIndex === -1) return;

        const signal = signals[signalIndex];
        signal.status = SignalStatus.STOPPED;

        // Loss is based on the stop loss price
        const isLong = signal.direction === 'LONG' || signal.direction === 'BUY';
        const finalPrice = signal.stopLoss;

        const finalProfit = isLong
            ? ((finalPrice - signal.entryPrice) / signal.entryPrice) * 100
            : ((signal.entryPrice - finalPrice) / signal.entryPrice) * 100;

        // Add to completed signals
        const completed = this.getCompletedSignals();
        completed.push({
            ...signal,
            status: SignalStatus.STOPPED,
            profitLossPercentage: finalProfit,
            completedAt: new Date().toISOString(),
            isScalping: type === 'scalping',
            isOnChain: type === 'onchain'
        });

        localStorage.setItem(this.COMPLETED_SIGNALS_KEY, JSON.stringify(completed));

        // Remove from active signals
        signals.splice(signalIndex, 1);
        this.setActiveSignals(signals, type);
    }

    /**
     * Get all completed signals
     */
    static getCompletedSignals(): any[] {
        try {
            const stored = localStorage.getItem(this.COMPLETED_SIGNALS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading completed signals:', error);
            return [];
        }
    }

    /**
     * Clear expired signals (older than 24 hours and completed or stopped)
     */
    static clearExpiredSignals(): void {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        ['standard', 'scalping', 'onchain'].forEach(type => {
            const signals = this.getActiveSignals(type as any);
            const filtered = signals.filter(signal => {
                const age = now - new Date(signal.timestamp).getTime();
                const isOld = age > maxAge;
                const isInactive = signal.status === SignalStatus.COMPLETED ||
                    signal.status === SignalStatus.STOPPED;
                return !(isOld && isInactive);
            });

            this.setActiveSignals(filtered, type as any);
        });
    }

    /**
     * Get auto-generation preferences
     */
    static getAutoGenPreferences(): AutoGenerationPreferences {
        try {
            const stored = localStorage.getItem(this.AUTO_GEN_KEY);
            return stored ? JSON.parse(stored) : {
                standard: { enabled: false, lastGenerated: 0 },
                scalping: { enabled: false, lastGenerated: 0 },
                onchain: { enabled: false, lastGenerated: 0 }
            };
        } catch (error) {
            return {
                standard: { enabled: false, lastGenerated: 0 },
                scalping: { enabled: false, lastGenerated: 0 },
                onchain: { enabled: false, lastGenerated: 0 }
            };
        }
    }

    /**
     * Save auto-generation preferences
     */
    static setAutoGenPreferences(prefs: AutoGenerationPreferences): void {
        localStorage.setItem(this.AUTO_GEN_KEY, JSON.stringify(prefs));
    }

    /**
     * Update last generated timestamp
     */
    static updateLastGenerated(type: 'standard' | 'scalping' | 'onchain'): void {
        const prefs = this.getAutoGenPreferences();
        prefs[type].lastGenerated = Date.now();
        this.setAutoGenPreferences(prefs);
    }

    /**
     * Clear all signals
     */
    static clearAllSignals(): void {
        localStorage.setItem(this.ACTIVE_SIGNALS_KEY, JSON.stringify({
            standard: [],
            scalping: [],
            onchain: []
        }));
    }

    /**
     * Get signal type from signal object
     */
    static getSignalType(signal: Signal): 'standard' | 'scalping' | 'onchain' {
        // Check if it's scalping (5-min timeframe)
        if (signal.timeframe === '5m' || (signal as any).isScalping) {
            return 'scalping';
        }

        // Check if it's on-chain (has onchain indicators)
        if ((signal as any).isOnChain || signal.rationalePoints?.some(r =>
            r.includes('whale') || r.includes('blockchain') || r.includes('on-chain')
        )) {
            return 'onchain';
        }

        return 'standard';
    }
}
