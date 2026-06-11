'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import {
    Zap, Target, TrendingUp, TrendingDown, Shield, Activity,
    Clock, Volume2, ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
    Check, X, Layers, BarChart3, Crosshair, ArrowUpRight, ArrowDownRight,
    Star, Award, Eye, Gauge, DollarSign, Gem, Bell, BellOff
} from 'lucide-react';
import { GoldSignalGenerator, GoldSignal, GOLD_PAIRS, GOLD_EXTENDED_PAIRS } from '@/lib/signals/goldSignalGenerator';
import { ICTEngine } from '@/lib/signals/ictEngine';
import { MarketType, SignalType } from '@/lib/signals/types';
import { ExnessAPI } from '@/lib/signals/exnessAPI';
import { ScalpingV2Chart } from '@/components/ui/ScalpingV2Chart';
import { requestNotificationPermission } from '@/lib/firebase/client';

function formatPrice(price: number): string {
    if (!price || isNaN(price)) return '0.00';
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Signal Score Badge (Gold themed)
function GoldScoreBadge({ score, grade }: { score: number; grade: string }) {
    const gradeColors: Record<string, string> = {
        'ELITE': 'from-amber-400 to-yellow-500',
        'A+': 'from-emerald-400 to-green-500',
        'A': 'from-blue-400 to-cyan-500',
        'B': 'from-gray-400 to-gray-500',
        'IGNORE': 'from-red-400 to-red-600'
    };

    const gradeGlow: Record<string, string> = {
        'ELITE': 'shadow-amber-500/50',
        'A+': 'shadow-emerald-500/40',
        'A': 'shadow-blue-500/30',
        'B': 'shadow-gray-500/20',
        'IGNORE': 'shadow-red-500/20'
    };

    return (
        <div className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${gradeColors[grade] || gradeColors['IGNORE']} shadow-lg ${gradeGlow[grade] || ''}`}>
            {grade === 'ELITE' && <Star className="w-4 h-4 text-black animate-pulse" />}
            {grade === 'A+' && <Award className="w-4 h-4 text-black" />}
            <span className="font-black text-black text-sm">{grade}</span>
            <span className="font-mono text-black/70 text-xs">{score}/100</span>
        </div>
    );
}

// Score Breakdown Component
function GoldScoreBreakdown({ score }: { score: GoldSignal['score'] }) {
    const items = [
        { label: 'Daily Bias', value: score.dailyBias, max: 15, color: 'bg-amber-500' },
        { label: 'Liquidity Sweep', value: score.liquiditySweep, max: 20, color: 'bg-yellow-500' },
        { label: 'Order Block', value: score.orderBlock, max: 15, color: 'bg-emerald-500' },
        { label: 'FVG', value: score.fvg, max: 10, color: 'bg-cyan-500' },
        { label: 'OTE', value: score.ote, max: 15, color: 'bg-orange-500' },
        { label: 'CHoCH/BOS', value: score.choch, max: 10, color: 'bg-rose-500' },
        { label: 'Volume', value: score.volume, max: 10, color: 'bg-indigo-500' },
        { label: 'Session', value: score.session, max: 5, color: 'bg-teal-500' },
    ];

    return (
        <div className="space-y-2">
            {items.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{item.label}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / item.max) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${item.color}`}
                        />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                        {item.value}/{item.max}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Confirmation Checklist
function GoldConfirmationChecklist({ signal }: { signal: GoldSignal }) {
    const checks = [
        {
            label: 'Daily Bias',
            detail: signal.dailyBias.bias,
            confirmed: signal.dailyBias.bias !== 'NEUTRAL',
            icon: TrendingUp
        },
        {
            label: 'Liquidity Sweep',
            detail: signal.liquiditySweep ? `${signal.liquiditySweep.type} at $${formatPrice(signal.liquiditySweep.sweptLevel)}` : 'Not detected',
            confirmed: !!signal.liquiditySweep,
            icon: Layers
        },
        {
            label: signal.premiumDiscount.currentZone === 'DISCOUNT' ? 'Discount Zone' : 'Premium Zone',
            detail: `EQ: $${formatPrice(signal.premiumDiscount.equilibrium)}`,
            confirmed: signal.type === 'BUY' ? signal.premiumDiscount.currentZone === 'DISCOUNT' : signal.premiumDiscount.currentZone === 'PREMIUM',
            icon: Target
        },
        {
            label: 'Order Block / FVG',
            detail: signal.orderBlockConfirmation
                ? `OB: $${formatPrice(signal.orderBlockConfirmation.low)} - $${formatPrice(signal.orderBlockConfirmation.high)}`
                : signal.fvgConfirmation
                    ? `FVG: $${formatPrice(signal.fvgConfirmation.low)} - $${formatPrice(signal.fvgConfirmation.high)}`
                    : 'Not in zone',
            confirmed: !!(signal.orderBlockConfirmation || signal.fvgConfirmation),
            icon: BarChart3
        },
        {
            label: 'OTE Zone',
            detail: signal.oteConfirmation
                ? `62%-79% Fib ($${formatPrice(signal.oteConfirmation.fib62)} - $${formatPrice(signal.oteConfirmation.fib79)})`
                : 'Outside OTE',
            confirmed: !!signal.oteConfirmation,
            icon: Crosshair
        },
        {
            label: 'CHoCH / BOS',
            detail: signal.chochConfirmation
                ? `${signal.chochConfirmation.type} ${signal.chochConfirmation.direction}`
                : 'Not detected',
            confirmed: !!signal.chochConfirmation,
            icon: Activity
        },
        {
            label: 'Volume',
            detail: signal.volumeConfirmation ? 'Above 20-period & 5-candle average' : 'Below average',
            confirmed: signal.volumeConfirmation,
            icon: Volume2
        },
        {
            label: 'Session',
            detail: signal.sessionConfirmation.sessionName,
            confirmed: signal.sessionConfirmation.isAllowed,
            icon: Clock
        },
    ];

    return (
        <div className="space-y-1.5">
            {checks.map((check, idx) => (
                <div
                    key={idx}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${check.confirmed ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'
                        }`}
                >
                    <div className={`p-1 rounded-md ${check.confirmed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        {check.confirmed
                            ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                            : <X className="w-3.5 h-3.5 text-red-400" />
                        }
                    </div>
                    <check.icon className={`w-3.5 h-3.5 ${check.confirmed ? 'text-emerald-400' : 'text-red-400/60'}`} />
                    <div className="flex-1 min-w-0">
                        <span className={`text-xs font-medium ${check.confirmed ? 'text-emerald-300' : 'text-red-300/70'}`}>
                            {check.label}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 truncate">{check.detail}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Gold Signal Card
function GoldSignalCard({ signal, index }: { signal: GoldSignal; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const isBuy = signal.type === 'BUY';
    const analysis = GoldSignalGenerator.getAnalysisSummary(signal);

    const dirColor = isBuy ? 'text-emerald-400' : 'text-rose-400';
    const dirBg = isBuy ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20';
    const dirGradient = isBuy
        ? 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        : 'from-rose-500/20 via-rose-500/5 to-transparent';

    const currentPrice = signal.currentPrice || signal.entry;
    let isInsideZone = false;
    let distancePct = 0;

    if (isBuy) {
        isInsideZone = currentPrice <= signal.entry * 1.001;
        distancePct = ((currentPrice - signal.entry) / signal.entry) * 100;
    } else {
        isInsideZone = currentPrice >= signal.entry * 0.999;
        distancePct = ((signal.entry - currentPrice) / signal.entry) * 100;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative"
        >
            {/* Glow effect for Elite signals */}
            {signal.score.grade === 'ELITE' && (
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 rounded-2xl blur-sm animate-pulse" />
            )}

            <div className={`relative rounded-2xl border border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl overflow-hidden`}>
                {/* Top gradient accent - Gold themed */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isBuy ? 'from-amber-400 via-yellow-500 to-amber-400' : 'from-rose-400 via-rose-500 to-red-500'}`} />

                {/* Card Header */}
                <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${dirBg} border`}>
                                {isBuy
                                    ? <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                                    : <ArrowDownRight className="w-5 h-5 text-rose-400" />
                                }
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-lg text-white flex items-center gap-1.5">
                                        <span className="text-amber-400">🥇</span> {signal.pair}
                                    </h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                        {signal.type}
                                    </span>
                                    {signal.status === 'ACTIVE' && (
                                        isInsideZone ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-pulse flex items-center gap-1 shrink-0">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                Inside Entry Zone
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 shrink-0">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                                Price Moved Away (+{distancePct.toFixed(2)}%)
                                            </span>
                                        )
                                    )}
                                    {signal.status === 'PENDING' && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse flex items-center gap-1 shrink-0">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                            Pending Setup (Diff: {distancePct > 0 ? '+' : ''}{distancePct.toFixed(2)}%)
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    HTF: 5m • LTF: 1m • {signal.sessionConfirmation.sessionName} • Exness/Forex
                                </p>
                            </div>
                        </div>
                        <GoldScoreBadge score={signal.score.total} grade={signal.score.grade} />
                    </div>

                    {/* Price Levels Grid */}
                    <div className={`rounded-xl bg-gradient-to-b ${dirGradient} p-4 mb-4`}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Entry</span>
                                <p className="font-mono font-bold text-white text-sm mt-1">${formatPrice(signal.entry)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-rose-400/70">Stop Loss</span>
                                <p className="font-mono font-bold text-rose-400 text-sm mt-1">${formatPrice(signal.stopLoss)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-emerald-400/70">TP1 (1:3)</span>
                                <p className="font-mono font-bold text-emerald-400 text-sm mt-1">${formatPrice(signal.tp1)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-amber-400/70">TP2 (1:5)</span>
                                <p className="font-mono font-bold text-amber-400 text-sm mt-1">${formatPrice(signal.tp2)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-white/5">
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-purple-400/70">TP3 (Liquidity)</span>
                                <p className="font-mono font-bold text-purple-400 text-sm mt-1">${formatPrice(signal.tp3)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">R:R Ratio</span>
                                <p className="font-mono font-bold text-white text-sm mt-1">1:{signal.riskRewardRatio}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-amber-400/70">Daily Bias</span>
                                <p className={`font-bold text-sm mt-1 ${signal.dailyBias.bias === 'BULLISH' ? 'text-emerald-400' : signal.dailyBias.bias === 'BEARISH' ? 'text-rose-400' : 'text-gray-400'}`}>
                                    {signal.dailyBias.bias}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Zone</span>
                                <p className={`font-bold text-sm mt-1 ${signal.premiumDiscount.currentZone === 'DISCOUNT' ? 'text-emerald-400' : signal.premiumDiscount.currentZone === 'PREMIUM' ? 'text-rose-400' : 'text-gray-400'}`}>
                                    {signal.premiumDiscount.currentZone}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Gold-Specific Info */}
                    {(signal.lotSizeRecommendation || signal.pipValue) && (
                        <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Gold Trade Info</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {signal.lotSizeRecommendation && (
                                    <div className="text-xs text-muted-foreground">
                                        <span className="text-amber-300/70">Lot Size ($100 risk):</span>{' '}
                                        <span className="text-white font-mono">{signal.lotSizeRecommendation}</span>
                                    </div>
                                )}
                                {signal.pipValue && (
                                    <div className="text-xs text-muted-foreground">
                                        <span className="text-amber-300/70">Pip Value:</span>{' '}
                                        <span className="text-white font-mono text-[10px]">{signal.pipValue}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Confirmation Icons */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                        {[
                            { key: 'liq', ok: !!signal.liquiditySweep, label: 'Liquidity' },
                            { key: 'ob', ok: !!signal.orderBlockConfirmation, label: 'OB' },
                            { key: 'fvg', ok: !!signal.fvgConfirmation, label: 'FVG' },
                            { key: 'ote', ok: !!signal.oteConfirmation, label: 'OTE' },
                            { key: 'choch', ok: !!signal.chochConfirmation, label: 'CHoCH' },
                            { key: 'vol', ok: signal.volumeConfirmation, label: 'Volume' },
                            { key: 'engulf', ok: signal.engulfingConfirmation, label: 'Engulfing' },
                        ].map(item => (
                            <div
                                key={item.key}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${item.ok
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-white/5 border-white/5 text-muted-foreground/40'
                                    }`}
                            >
                                {item.ok ? '✓' : '○'} {item.label}
                            </div>
                        ))}
                    </div>

                    {/* Expand Button */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs text-muted-foreground"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        {expanded ? 'Hide Details' : 'Full Analysis'}
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                                {/* Live Candlestick Chart */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                                        Live Gold Chart
                                    </h4>
                                    <ScalpingV2Chart signal={signal as any} />
                                </div>

                                {/* Score Breakdown */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Gauge className="w-3.5 h-3.5" />
                                        Signal Score Breakdown
                                    </h4>
                                    <GoldScoreBreakdown score={signal.score} />
                                </div>

                                {/* Confirmation Checklist */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Shield className="w-3.5 h-3.5" />
                                        Entry Conditions Checklist
                                    </h4>
                                    <GoldConfirmationChecklist signal={signal} />
                                </div>

                                {/* Analysis Summary */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        ICT Analysis
                                    </h4>
                                    <div className="space-y-1.5">
                                        {analysis.map((line, i) => (
                                            <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>
                                        ))}
                                    </div>
                                </div>

                                {/* Gold Risk Management */}
                                <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
                                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Gold Risk Management
                                    </h4>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>• Stop Loss: Below Liquidity Sweep Low</p>
                                        <p>• Move SL to Break-Even after TP1 hit</p>
                                        <p>• TP1 (1:3 RR) → TP2 (1:5 RR) → TP3 (Opposite Liquidity Pool)</p>
                                        <p>• Max risk: 1-2% of account per trade</p>
                                        <p>• Gold spreads widen during Asian session — prefer London/NY</p>
                                        <p>• Watch for USD news (NFP, CPI, FOMC) — major gold movers</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// Session Status Widget
function GoldSessionStatus() {
    const [session, setSession] = useState(ICTEngine.getCurrentSession());

    useEffect(() => {
        const interval = setInterval(() => {
            setSession(ICTEngine.getCurrentSession());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${session.isAllowed
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'
            }`}>
            <div className={`w-2 h-2 rounded-full ${session.isAllowed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={`text-xs font-semibold ${session.isAllowed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {session.sessionName}
            </span>
        </div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

export default function GoldSignalsPage() {
    const [signals, setSignals] = useState<GoldSignal[]>([]);
    const [runningSignals, setRunningSignals] = useState<GoldSignal[]>([]);
    const [activeTab, setActiveTab] = useState<'NEW' | 'RUNNING'>('NEW');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<'GOLD' | null>(null);
    const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [nextScanTime, setNextScanTime] = useState<number>(120); // 2 min interval for gold
    const [scannedPairs, setScannedPairs] = useState<string[]>(GOLD_PAIRS);
    const [runningSubFilter, setRunningSubFilter] = useState<'ACTIVE' | 'COMPLETED' | 'STOPPED'>('ACTIVE');
    const [tpSubFilter, setTpSubFilter] = useState<'ALL' | 'TP1' | 'TP2' | 'TP3'>('ALL');
    const isLoadedRef = useRef(false);

    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        const autoSubscribe = async () => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                    const token = await requestNotificationPermission();
                    if (token) {
                        setIsSubscribed(true);
                        localStorage.setItem('goldPushSubscribed', 'true');
                    }
                }
            }
        };

        const savedSub = localStorage.getItem('goldPushSubscribed') === 'true';
        if (savedSub) {
            autoSubscribe();
        } else {
            setIsSubscribed(false);
        }
    }, []);

    const handleSubscribe = async () => {
        if (isSubscribed) {
            setIsSubscribed(false);
            localStorage.setItem('goldPushSubscribed', 'false');
        } else {
            try {
                const token = await requestNotificationPermission();
                if (token) {
                    setIsSubscribed(true);
                    localStorage.setItem('goldPushSubscribed', 'true');
                }
            } catch (error) {
                console.error('Failed to subscribe to push notifications:', error);
            }
        }
    };

    const filteredRunningSignals = runningSignals.filter(s => {
        if (runningSubFilter === 'ACTIVE') return s.status === 'ACTIVE' || s.status === 'PENDING';
        if (runningSubFilter === 'COMPLETED') {
            if (s.status !== 'COMPLETED') return false;
            if (tpSubFilter === 'ALL') return true;
            return s.highestTPHit === tpSubFilter;
        }
        if (runningSubFilter === 'STOPPED') return s.status === 'STOPPED';
        return true;
    });

    // Load saved signals from localStorage on mount
    useEffect(() => {
        try {
            const savedNew = localStorage.getItem('goldNewSetups');
            const savedRunning = localStorage.getItem('goldRunningTrades');
            if (savedNew) setSignals(JSON.parse(savedNew));
            if (savedRunning) setRunningSignals(JSON.parse(savedRunning));

            const savedPairs = localStorage.getItem('goldScannedPairs');
            if (savedPairs) {
                setScannedPairs(JSON.parse(savedPairs));
            } else {
                setScannedPairs(GOLD_PAIRS);
            }
        } catch (e) {
            console.error('Failed to load saved Gold signals', e);
        } finally {
            isLoadedRef.current = true;
        }
    }, []);

    // Sync to localStorage
    useEffect(() => {
        if (!isLoadedRef.current) return;
        localStorage.setItem('goldNewSetups', JSON.stringify(signals));
    }, [signals]);

    useEffect(() => {
        if (!isLoadedRef.current) return;
        localStorage.setItem('goldScannedPairs', JSON.stringify(scannedPairs));
    }, [scannedPairs]);

    useEffect(() => {
        if (!isLoadedRef.current) return;
        localStorage.setItem('goldRunningTrades', JSON.stringify(runningSignals));
    }, [runningSignals]);

    const generateSignals = useCallback(async () => {
        setIsLoading(true);
        setScanCount(0);
        setNextScanTime(120);

        try {
            // Move existing active or pending signals to running
            setRunningSignals(prev => {
                const activeFromCurrent = signals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING');
                const uniqueNew = activeFromCurrent.filter(
                    s => !prev.some(p => p.id === s.id)
                );
                return [...prev, ...uniqueNew];
            });

            const selectedPairs = scannedPairs.length > 0 ? [...scannedPairs] : [...GOLD_PAIRS];

            const generated = await GoldSignalGenerator.generateSignals(
                selectedPairs,
                MarketType.FOREX,
                SignalType.FUTURE
            );

            setScanCount(selectedPairs.length);
            setSignals(generated);
            setLastGenerated(new Date());
            setNextScanTime(120);
            setActiveTab('NEW');

            // Broadcast push notification for newly generated signals
            if (generated.length > 0) {
                const topSignal = generated[0];
                try {
                    await fetch('/api/notifications/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(topSignal),
                    });
                } catch (e) {
                    console.warn('Failed to send push notification API broadcast:', e);
                }
            }
        } catch (error) {
            console.error('Gold Signal generation failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [signals, scannedPairs]);

    // Auto-scan timer (2 minutes)
    const generateSignalsRef = useRef(generateSignals);
    useEffect(() => {
        generateSignalsRef.current = generateSignals;
    }, [generateSignals]);

    useEffect(() => {
        if (!selectedMarket || isLoading) return;

        const interval = setInterval(() => {
            setNextScanTime(prev => {
                if (prev <= 1) {
                    generateSignalsRef.current();
                    return 120;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedMarket, isLoading]);

    // Clear inactive running signals
    const clearInactiveRunning = () => {
        setRunningSignals(prev => prev.filter(s => s.status === 'ACTIVE'));
    };

    // Auto-generate when market selected
    useEffect(() => {
        if (selectedMarket) {
            generateSignals();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMarket]);

    // Live price updates for active Gold signals
    useEffect(() => {
        if ((signals.length === 0 && runningSignals.length === 0) || isLoading) return;

        let active = true;

        const updatePricesList = async (list: GoldSignal[]) => {
            return await Promise.all(
                list.map(async (signal) => {
                    if (
                        signal.status !== 'ACTIVE' &&
                        signal.status !== 'PENDING' &&
                        !(
                            signal.status === 'COMPLETED' &&
                            (signal.highestTPHit === 'TP1' ||
                             !signal.highestTPHit ||
                             (signal.highestTPHit === 'TP2' && signal.tp2HitTime && Date.now() - signal.tp2HitTime <= 30 * 60 * 1000))
                        )
                    ) {
                        return signal;
                    }

                    try {
                        const price = await GoldSignalGenerator.getCurrentGoldPrice(signal.pair);

                        if (price && !isNaN(price) && active) {
                            let status: GoldSignal['status'] = signal.status;
                            const isBuy = signal.type === 'BUY';

                            if (signal.status === 'PENDING') {
                                // Check if entry price is hit/crossed
                                const triggered = isBuy ? price <= signal.entry : price >= signal.entry;
                                if (triggered) {
                                    status = 'ACTIVE';
                                    // Broadcast activation push notification
                                    fetch('/api/notifications/send', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            ...signal,
                                            status: 'ACTIVE',
                                        }),
                                    }).catch(err => console.warn('Failed to send trigger activation push:', err));
                                }
                                // Cancel setup if it goes the wrong way (SL) or moves directly to TP1 without triggering
                                const slHit = isBuy ? price <= signal.stopLoss : price >= signal.stopLoss;
                                const tp1Hit = isBuy ? price >= signal.tp1 : price <= signal.tp1;
                                if (slHit || tp1Hit) {
                                    status = 'STOPPED';
                                }
                            } else {
                                // Already ACTIVE or COMPLETED — progressive TP tracking
                                const slHit = isBuy ? price <= signal.stopLoss : price >= signal.stopLoss;
                                const nowTP1 = isBuy ? price >= signal.tp1 : price <= signal.tp1;
                                const nowTP2 = isBuy ? price >= signal.tp2 : price <= signal.tp2;
                                const nowTP3 = isBuy ? price >= signal.tp3 : price <= signal.tp3;

                                if (slHit && signal.status !== 'COMPLETED') {
                                    status = 'STOPPED';
                                } else {
                                    // Track TP1 hit
                                    if (nowTP1 && !signal.tp1Hit) {
                                        signal = { ...signal, tp1Hit: true, tp1HitTime: Date.now(), highestTPHit: 'TP1' as const };
                                        status = 'COMPLETED';
                                    }
                                    // Track TP2 hit (upgrades from TP1)
                                    if (nowTP2 && signal.tp1Hit && !signal.tp2Hit) {
                                        signal = { ...signal, tp2Hit: true, tp2HitTime: Date.now(), highestTPHit: 'TP2' as const };
                                        status = 'COMPLETED';
                                    }
                                    // Track TP3 hit within 30 min of TP2
                                    if (nowTP3 && signal.tp2Hit && !signal.tp3Hit) {
                                        const tp2Time = signal.tp2HitTime || 0;
                                        const elapsed = Date.now() - tp2Time;
                                        if (elapsed <= 30 * 60 * 1000) {
                                            signal = { ...signal, tp3Hit: true, tp3HitTime: Date.now(), highestTPHit: 'TP3' as const };
                                        }
                                        status = 'COMPLETED';
                                    }
                                    // 30-min timeout: if TP2 hit but TP3 not hit within 30 min, finalize at TP2
                                    if (signal.tp2Hit && !signal.tp3Hit && signal.tp2HitTime) {
                                        const elapsed = Date.now() - signal.tp2HitTime;
                                        if (elapsed > 30 * 60 * 1000) {
                                            signal = { ...signal, highestTPHit: 'TP2' as const };
                                            status = 'COMPLETED';
                                        }
                                    }
                                }
                            }

                            // Update LTF candles
                            let updatedLtfCandles = signal.ltfCandles ? [...signal.ltfCandles] : [];
                            if (updatedLtfCandles.length > 0) {
                                const lastCandle = updatedLtfCandles[updatedLtfCandles.length - 1];
                                const nowMs = Date.now();
                                const currentMinuteMs = Math.floor(nowMs / 60000) * 60000;

                                if (currentMinuteMs > lastCandle.timestamp) {
                                    updatedLtfCandles.push({
                                        timestamp: currentMinuteMs,
                                        open: lastCandle.close,
                                        high: Math.max(lastCandle.close, price),
                                        low: Math.min(lastCandle.close, price),
                                        close: price,
                                        volume: 0
                                    });
                                    if (updatedLtfCandles.length > 150) {
                                        updatedLtfCandles.shift();
                                    }
                                } else {
                                    updatedLtfCandles[updatedLtfCandles.length - 1] = {
                                        ...lastCandle,
                                        high: Math.max(lastCandle.high, price),
                                        low: Math.min(lastCandle.low, price),
                                        close: price
                                    };
                                }
                            }

                            // Update HTF candles
                            let updatedHtfCandles = signal.htfCandles ? [...signal.htfCandles] : [];
                            if (updatedHtfCandles.length > 0) {
                                const lastCandle = updatedHtfCandles[updatedHtfCandles.length - 1];
                                const nowMs = Date.now();
                                const current5MinMs = Math.floor(nowMs / 300000) * 300000;

                                if (current5MinMs > lastCandle.timestamp) {
                                    updatedHtfCandles.push({
                                        timestamp: current5MinMs,
                                        open: lastCandle.close,
                                        high: Math.max(lastCandle.close, price),
                                        low: Math.min(lastCandle.close, price),
                                        close: price,
                                        volume: 0
                                    });
                                    if (updatedHtfCandles.length > 100) {
                                        updatedHtfCandles.shift();
                                    }
                                } else {
                                    updatedHtfCandles[updatedHtfCandles.length - 1] = {
                                        ...lastCandle,
                                        high: Math.max(lastCandle.high, price),
                                        low: Math.min(lastCandle.low, price),
                                        close: price
                                    };
                                }
                            }

                            return {
                                ...signal,
                                currentPrice: price,
                                status,
                                ltfCandles: updatedLtfCandles,
                                htfCandles: updatedHtfCandles
                            };
                        }
                    } catch (e) {
                        console.warn(`Failed to update live price for ${signal.pair}`, e);
                    }
                    return signal;
                })
            );
        };

        const updatePrices = async () => {
            try {
                if (signals.length > 0) {
                    const newUpdated = await updatePricesList(signals);
                    if (active) {
                        // Separate signals that hit SL/TP (completed/stopped) from still-active ones
                        const hitSignals = newUpdated.filter(s => s.status === 'COMPLETED' || s.status === 'STOPPED');
                        const stillActive = newUpdated.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING');

                        // Move hit signals to Running Trades tab
                        if (hitSignals.length > 0) {
                            setRunningSignals(prev => {
                                const uniqueHit = hitSignals.filter(
                                    h => !prev.some(p => p.id === h.id)
                                );
                                return [...prev, ...uniqueHit];
                            });
                            // Keep only active signals in New Setups
                            setSignals(stillActive);
                        } else {
                            setSignals(prev => {
                                const hasChanged = prev.some((s, idx) => {
                                    const updated = newUpdated[idx];
                                    return !updated || updated.currentPrice !== s.currentPrice || updated.status !== s.status;
                                });
                                return hasChanged ? newUpdated : prev;
                            });
                        }
                    }
                }

                if (runningSignals.length > 0) {
                    const runningUpdated = await updatePricesList(runningSignals);
                    if (active) {
                        setRunningSignals(prev => {
                            const hasChanged = prev.some((s, idx) => {
                                const updated = runningUpdated[idx];
                                return !updated || updated.currentPrice !== s.currentPrice || updated.status !== s.status;
                            });
                            return hasChanged ? runningUpdated : prev;
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating live gold prices:', error);
            }
        };

        const interval = setInterval(updatePrices, 5000); // 5s for gold
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [signals, runningSignals, isLoading]);

    return (
        <div className="min-h-screen bg-[#050508]">
            <Navbar />

            {/* Hero Header */}
            <div className="relative overflow-hidden">
                {/* Background effects - Gold themed */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
                    <div className="absolute top-20 right-1/4 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-orange-500/3 rounded-full blur-3xl" />
                </div>

                <div className="relative container mx-auto px-4 pt-8 pb-6">
                    {/* Gold Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center mb-6"
                    >
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-orange-500/30 rounded-2xl blur-md" />
                            <div className="relative bg-[#0a0a14]/90 border border-white/10 rounded-2xl px-4 py-3 flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left">
                                <div className="flex items-center gap-2">
                                    <Gem className="w-5 h-5 text-amber-400" />
                                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 text-lg tracking-tight">
                                        GOLD SIGNALS
                                    </span>
                                </div>
                                <div className="hidden md:block h-5 w-px bg-white/10" />
                                <span className="text-xs text-muted-foreground font-medium">
                                    ICT • Smart Money Concepts
                                </span>
                                <div className="hidden md:block h-5 w-px bg-white/10" />
                                <GoldSessionStatus />
                            </div>
                        </div>
                    </motion.div>

                    {/* Market Selection (if not yet selected) */}
                    {!selectedMarket && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-3xl mx-auto text-center"
                        >
                            <h1 className="text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50">
                                Institutional-Grade
                                <br />
                                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                    Gold Trading Engine
                                </span>
                            </h1>
                            <p className="text-muted-foreground mb-2 max-w-lg mx-auto">
                                ICT / Smart Money Concepts based XAU/USD signal generation.
                                HTF: 5 Minute • LTF: 1 Minute
                            </p>
                            <p className="text-muted-foreground/60 text-sm mb-8 max-w-lg mx-auto">
                                BOS • CHoCH • Liquidity Sweeps • FVG • Order Blocks • OTE • Premium/Discount Zones
                            </p>

                            <div className="flex justify-center gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedMarket('GOLD')}
                                    className="relative group"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/40 to-yellow-500/40 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative px-16 py-8 rounded-2xl bg-[#0a0a14] border border-amber-500/20 hover:border-amber-500/40 transition-all">
                                        <span className="text-5xl mb-3 block">🥇</span>
                                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">Gold (XAU/USD)</h3>
                                        <p className="text-xs text-muted-foreground mt-2">Forex • Exness Compatible</p>
                                    </div>
                                </motion.button>
                            </div>

                            {/* Feature Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 max-w-2xl mx-auto">
                                {[
                                    { icon: Crosshair, label: 'OTE Zones', desc: '62%-79% Fib' },
                                    { icon: Layers, label: 'Order Blocks', desc: 'Institutional' },
                                    { icon: Activity, label: 'CHoCH/BOS', desc: 'Structure' },
                                    { icon: Shield, label: 'Risk Mgmt', desc: '1:3 to 1:5 RR' },
                                ].map((feat, idx) => (
                                    <motion.div
                                        key={feat.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + idx * 0.1 }}
                                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center"
                                    >
                                        <feat.icon className="w-5 h-5 mx-auto text-amber-400/60 mb-1.5" />
                                        <p className="text-xs font-semibold text-white/80">{feat.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{feat.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Signal Generation Active */}
                    {selectedMarket && (
                        <div>
                            {/* Tab Switcher */}
                            <div className="flex border-b border-white/5 mb-6">
                                <button
                                    onClick={() => setActiveTab('NEW')}
                                    className={`px-6 py-3 border-b-2 text-sm font-bold transition-all ${
                                        activeTab === 'NEW'
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-transparent text-muted-foreground hover:text-white'
                                    }`}
                                >
                                    New Setups ({signals.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('RUNNING')}
                                    className={`px-6 py-3 border-b-2 text-sm font-bold transition-all relative ${
                                        activeTab === 'RUNNING'
                                            ? 'border-amber-500 text-amber-400'
                                            : 'border-transparent text-muted-foreground hover:text-white'
                                    }`}
                                >
                                    Running Trades ({runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length})
                                    {runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length > 0 && (
                                        <span className="absolute top-2.5 right-1.5 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Running Trades Sub-Filters */}
                            {activeTab === 'RUNNING' && (
                                <div className="flex flex-col gap-3 mb-6">
                                    <div className="flex gap-2 bg-white/[0.02] p-1.5 rounded-xl border border-white/5 w-fit">
                                        {[
                                            { key: 'ACTIVE', label: 'Active / Pending', count: runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length, color: 'text-amber-400' },
                                            { key: 'COMPLETED', label: 'TP Hit', count: runningSignals.filter(s => s.status === 'COMPLETED').length, color: 'text-emerald-400' },
                                            { key: 'STOPPED', label: 'SL Hit', count: runningSignals.filter(s => s.status === 'STOPPED').length, color: 'text-rose-400' }
                                        ].map(sub => (
                                            <button
                                                key={sub.key}
                                                onClick={() => setRunningSubFilter(sub.key as any)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                                    runningSubFilter === sub.key
                                                        ? 'bg-white/10 text-white shadow-md'
                                                        : 'text-muted-foreground hover:text-white'
                                                }`}
                                            >
                                                <span className={runningSubFilter === sub.key ? sub.color : 'text-muted-foreground'}>•</span>
                                                {sub.label}
                                                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono font-semibold">
                                                    {sub.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* TP Level Sub-Filter (only visible when COMPLETED/TP Hit is selected) */}
                                    {runningSubFilter === 'COMPLETED' && runningSignals.filter(s => s.status === 'COMPLETED').length > 0 && (
                                        <div className="flex gap-1.5 bg-emerald-500/[0.03] p-1.5 rounded-xl border border-emerald-500/10 w-fit">
                                            {[
                                                { key: 'ALL', label: 'All TP', count: runningSignals.filter(s => s.status === 'COMPLETED').length, color: 'text-emerald-400', emoji: '📊' },
                                                { key: 'TP1', label: 'TP1', count: runningSignals.filter(s => s.status === 'COMPLETED' && s.highestTPHit === 'TP1').length, color: 'text-emerald-400', emoji: '🎯' },
                                                { key: 'TP2', label: 'TP2', count: runningSignals.filter(s => s.status === 'COMPLETED' && s.highestTPHit === 'TP2').length, color: 'text-amber-400', emoji: '🏆' },
                                                { key: 'TP3', label: 'TP3', count: runningSignals.filter(s => s.status === 'COMPLETED' && s.highestTPHit === 'TP3').length, color: 'text-purple-400', emoji: '💎' },
                                            ].map(tp => (
                                                <button
                                                    key={tp.key}
                                                    onClick={() => setTpSubFilter(tp.key as any)}
                                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                                        tpSubFilter === tp.key
                                                            ? 'bg-white/10 text-white shadow-md border border-white/10'
                                                            : 'text-muted-foreground hover:text-white hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span>{tp.emoji}</span>
                                                    <span className={tpSubFilter === tp.key ? tp.color : 'text-muted-foreground'}>{tp.label}</span>
                                                    <span className="px-1 py-0.5 rounded bg-white/5 text-[9px] font-mono font-semibold">
                                                        {tp.count}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stats Bar */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                {activeTab === 'NEW' ? (
                                    [
                                        {
                                            label: 'Signals Found',
                                            value: signals.length,
                                            icon: Zap,
                                            color: 'text-amber-400',
                                            bg: 'bg-amber-500/10'
                                        },
                                        {
                                            label: 'Pairs Scanned',
                                            value: scanCount,
                                            icon: Target,
                                            color: 'text-yellow-400',
                                            bg: 'bg-yellow-500/10'
                                        },
                                        {
                                            label: 'Elite Setups',
                                            value: signals.filter(s => s.score.grade === 'ELITE').length,
                                            icon: Star,
                                            color: 'text-orange-400',
                                            bg: 'bg-orange-500/10'
                                        },
                                        {
                                            label: 'A+ Setups',
                                            value: signals.filter(s => s.score.grade === 'A+').length,
                                            icon: Award,
                                            color: 'text-emerald-400',
                                            bg: 'bg-emerald-500/10'
                                        }
                                    ].map((stat, idx) => (
                                        <motion.div
                                            key={stat.label}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="rounded-xl bg-[#0a0a14]/80 border border-white/5 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-black text-white">{stat.value}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    [
                                        {
                                            label: 'Total Running',
                                            value: runningSignals.length,
                                            icon: Layers,
                                            color: 'text-amber-400',
                                            bg: 'bg-amber-500/10'
                                        },
                                        {
                                            label: 'Active / Pending',
                                            value: runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length,
                                            icon: Activity,
                                            color: 'text-yellow-400',
                                            bg: 'bg-yellow-500/10'
                                        },
                                        {
                                            label: 'TP Hit / Completed',
                                            value: runningSignals.filter(s => s.status === 'COMPLETED').length,
                                            icon: Check,
                                            color: 'text-emerald-400',
                                            bg: 'bg-emerald-500/10'
                                        },
                                        {
                                            label: 'SL Hit / Stopped',
                                            value: runningSignals.filter(s => s.status === 'STOPPED').length,
                                            icon: AlertTriangle,
                                            color: 'text-rose-400',
                                            bg: 'bg-rose-500/10'
                                        }
                                    ].map((stat, idx) => (
                                        <motion.div
                                            key={stat.label}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="rounded-xl bg-[#0a0a14]/80 border border-white/5 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${stat.bg}`}>
                                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-black text-white">{stat.value}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            {/* Scan pairs info */}
                            <div className="mb-6 rounded-2xl border border-amber-500/10 bg-[#0a0a14]/60 backdrop-blur-xl overflow-hidden p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-3">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <Gem className="w-4 h-4 text-amber-400" />
                                        <span className="font-bold text-amber-400/80 uppercase tracking-wider">Scanning:</span>
                                        {scannedPairs.map(pair => (
                                            <span key={pair} className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold">
                                                {pair}
                                            </span>
                                        ))}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {!scannedPairs.includes('XAG/USD') && (
                                            <button
                                                onClick={() => setScannedPairs(prev => [...prev, 'XAG/USD'])}
                                                className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-all"
                                            >
                                                + Add Silver (XAG/USD)
                                            </button>
                                        )}
                                        {scannedPairs.includes('XAG/USD') && (
                                            <button
                                                onClick={() => setScannedPairs(prev => prev.filter(p => p !== 'XAG/USD'))}
                                                className="text-[10px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/10 border border-white/10 text-muted-foreground hover:text-rose-400 transition-all"
                                            >
                                                Remove Silver
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                                    {activeTab === 'NEW' ? (
                                        <>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={generateSignals}
                                                disabled={isLoading}
                                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-amber-500/20 transition-all w-full sm:w-auto"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                                {isLoading ? 'Scanning Gold...' : 'Re-Scan Gold'}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSubscribe}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all w-full sm:w-auto ${
                                                    isSubscribed
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                                }`}
                                            >
                                                {isSubscribed ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-amber-400 animate-pulse" />}
                                                {isSubscribed ? 'Notifications Active' : 'Enable Notifications'}
                                            </motion.button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {runningSignals.some(s => s.status !== 'ACTIVE') && (
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={clearInactiveRunning}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all w-full sm:w-auto"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Clear Inactive Trades
                                                </motion.button>
                                            )}
                                        </div>
                                    )}

                                    {lastGenerated && (
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs text-muted-foreground">
                                                Last scan: {lastGenerated.toLocaleTimeString()}
                                            </span>
                                            <span className="text-xs text-muted-foreground/40">•</span>
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                                </span>
                                                <span className="text-xs font-semibold font-mono text-amber-400">
                                                    Auto-scan: {formatTime(nextScanTime)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedMarket(null);
                                        setSignals([]);
                                        setRunningSignals([]);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
                                >
                                    ← Back
                                </button>
                            </div>

                            {/* Loading State */}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-20"
                                >
                                    <div className="relative w-20 h-20 mx-auto mb-6">
                                        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
                                        <div className="absolute inset-0 rounded-full border-2 border-t-amber-400 border-r-yellow-400 border-b-transparent border-l-transparent animate-spin" />
                                        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-orange-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                        <Gem className="absolute inset-0 m-auto w-6 h-6 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Scanning Gold with ICT Engine</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Analyzing XAU/USD structure, liquidity, order blocks, FVGs...
                                    </p>
                                    <div className="flex justify-center gap-2 mt-4">
                                        {['BOS', 'CHoCH', 'FVG', 'OB', 'OTE', 'Liquidity'].map((term, i) => (
                                            <motion.span
                                                key={term}
                                                initial={{ opacity: 0.3 }}
                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                                                className="text-[10px] px-2 py-1 rounded-md bg-amber-500/5 text-amber-400/70 font-mono"
                                            >
                                                {term}
                                            </motion.span>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Signals List */}
                            {!isLoading && (activeTab === 'NEW' ? signals : filteredRunningSignals).length > 0 && (
                                <div className="space-y-4">
                                    {(activeTab === 'NEW' ? signals : filteredRunningSignals).map((signal, idx) => (
                                        <GoldSignalCard key={signal.id} signal={signal} index={idx} />
                                    ))}
                                </div>
                            )}

                            {/* No Signals (NEW setups tab) */}
                            {!isLoading && activeTab === 'NEW' && signals.length === 0 && lastGenerated && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-20"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">No Elite/A+ Gold Setups Found</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        The ICT engine requires all conditions to be met for high-quality signals.
                                        Gold market structure, liquidity sweeps, or session conditions may not be optimal right now.
                                    </p>
                                    <button
                                        onClick={generateSignals}
                                        className="mt-6 px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-semibold text-sm transition-all"
                                    >
                                        <RefreshCw className="w-4 h-4 inline mr-2" />
                                        Re-Scan Gold
                                    </button>
                                </motion.div>
                            )}

                            {/* No Running Trades */}
                            {!isLoading && activeTab === 'RUNNING' && filteredRunningSignals.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-20"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                        {runningSubFilter === 'ACTIVE' && <Layers className="w-8 h-8 text-amber-400" />}
                                        {runningSubFilter === 'COMPLETED' && <Check className="w-8 h-8 text-emerald-400" />}
                                        {runningSubFilter === 'STOPPED' && <AlertTriangle className="w-8 h-8 text-rose-400" />}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {runningSubFilter === 'ACTIVE' && 'No Active Gold Trades'}
                                        {runningSubFilter === 'COMPLETED' && 'No TP Hit Trades'}
                                        {runningSubFilter === 'STOPPED' && 'No SL Hit Trades'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        {runningSubFilter === 'ACTIVE' && 'There are no active running gold trades currently in play.'}
                                        {runningSubFilter === 'COMPLETED' && 'No gold trades have reached their Take Profit targets in this session.'}
                                        {runningSubFilter === 'STOPPED' && 'No gold trades have hit their Stop Loss limits in this session.'}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
