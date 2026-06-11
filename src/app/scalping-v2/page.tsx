'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import {
    Zap, Target, TrendingUp, TrendingDown, Shield, Activity,
    Clock, Volume2, ChevronDown, ChevronUp, RefreshCw, AlertTriangle,
    Check, X, Layers, BarChart3, Crosshair, ArrowUpRight, ArrowDownRight,
    Star, Award, Eye, Gauge, Bell, BellOff
} from 'lucide-react';
import { ScalpingV2Generator, ScalpingV2Signal } from '@/lib/signals/scalpingV2Generator';
import { ICTEngine } from '@/lib/signals/ictEngine';
import { MarketType, SignalType } from '@/lib/signals/types';
import { BinanceAPI } from '@/lib/signals/binanceAPI';
import { ScalpingV2Chart } from '@/components/ui/ScalpingV2Chart';
import { requestNotificationPermission } from '@/lib/firebase/client';

const CRYPTO_PAIRS = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
    'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT',
    'UNI/USDT', 'NEAR/USDT', 'SUI/USDT', 'OP/USDT', 'ARB/USDT',
    'MATIC/USDT', 'ATOM/USDT', 'FIL/USDT', 'INJ/USDT', 'RNDR/USDT',
    'FET/USDT', 'TIA/USDT', 'PEPE/USDT', 'WLD/USDT'
];

const POPULAR_COINS = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
    'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'LINK/USDT',
    'UNI/USDT', 'NEAR/USDT', 'SUI/USDT', 'OP/USDT', 'ARB/USDT',
    'MATIC/USDT', 'ATOM/USDT', 'FIL/USDT', 'INJ/USDT', 'RNDR/USDT',
    'FET/USDT', 'TIA/USDT', 'PEPE/USDT', 'WLD/USDT', 'LTC/USDT',
    'BCH/USDT', 'TRX/USDT', 'ETC/USDT', 'ICP/USDT', 'LDO/USDT',
    'APT/USDT', 'STX/USDT', 'FTM/USDT', 'IMX/USDT', 'GRT/USDT',
    'AAVE/USDT', 'EGLD/USDT', 'SAND/USDT', 'GALA/USDT', 'RUNE/USDT',
    'SHIB/USDT', 'APE/USDT', 'DYDX/USDT', 'FLOW/USDT', 'AXS/USDT',
    'THETA/USDT', 'JTO/USDT', 'PYTH/USDT', 'JUP/USDT', 'W/USDT',
    'ENA/USDT', 'STRK/USDT', 'AEVO/USDT'
];

function formatPrice(price: number): string {
    if (!price || isNaN(price)) return '0.0000';
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Signal Score Badge
function ScoreBadge({ score, grade }: { score: number; grade: string }) {
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
function ScoreBreakdown({ score }: { score: ScalpingV2Signal['score'] }) {
    const items = [
        { label: 'Daily Bias', value: score.dailyBias, max: 15, color: 'bg-blue-500' },
        { label: 'Liquidity Sweep', value: score.liquiditySweep, max: 20, color: 'bg-purple-500' },
        { label: 'Order Block', value: score.orderBlock, max: 15, color: 'bg-emerald-500' },
        { label: 'FVG', value: score.fvg, max: 10, color: 'bg-cyan-500' },
        { label: 'OTE', value: score.ote, max: 15, color: 'bg-amber-500' },
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
function ConfirmationChecklist({ signal }: { signal: ScalpingV2Signal }) {
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

// Signal Card
function ICTSignalCard({ signal, index }: { signal: ScalpingV2Signal; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const isBuy = signal.type === 'BUY';
    const analysis = ScalpingV2Generator.getAnalysisSummary(signal);

    const dirColor = isBuy ? 'text-emerald-400' : 'text-rose-400';
    const dirBg = isBuy ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20';
    const dirGradient = isBuy
        ? 'from-emerald-500/20 via-emerald-500/5 to-transparent'
        : 'from-rose-500/20 via-rose-500/5 to-transparent';

    // Calculate distance from entry to current price
    const currentPrice = signal.currentPrice || signal.entry;
    let isInsideZone = false;
    let distancePct = 0;

    if (isBuy) {
        isInsideZone = currentPrice <= signal.entry * 1.001; // 0.1% tolerance
        distancePct = ((currentPrice - signal.entry) / signal.entry) * 100;
    } else {
        isInsideZone = currentPrice >= signal.entry * 0.999; // 0.1% tolerance
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
                {/* Top gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isBuy ? 'from-emerald-400 via-emerald-500 to-green-500' : 'from-rose-400 via-rose-500 to-red-500'}`} />

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
                                    <h3 className="font-bold text-lg text-white">{signal.pair}</h3>
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
                                    HTF: 5m • LTF: 1m • {signal.sessionConfirmation.sessionName}
                                </p>
                            </div>
                        </div>
                        <ScoreBadge score={signal.score.total} grade={signal.score.grade} />
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
                                <span className="text-[10px] uppercase tracking-wider text-blue-400/70">Daily Bias</span>
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
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                        Live Candlestick Chart
                                    </h4>
                                    <ScalpingV2Chart signal={signal} />
                                </div>

                                {/* Score Breakdown */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Gauge className="w-3.5 h-3.5" />
                                        Signal Score Breakdown
                                    </h4>
                                    <ScoreBreakdown score={signal.score} />
                                </div>

                                {/* Confirmation Checklist */}
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Shield className="w-3.5 h-3.5" />
                                        Entry Conditions Checklist
                                    </h4>
                                    <ConfirmationChecklist signal={signal} />
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

                                {/* Risk Management */}
                                <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-4">
                                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Risk Management
                                    </h4>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>• Stop Loss: Below Liquidity Sweep Low</p>
                                        <p>• Move SL to Break-Even after TP1 hit</p>
                                        <p>• TP1 (1:3 RR) → TP2 (1:5 RR) → TP3 (Opposite Liquidity Pool)</p>
                                        <p>• Max risk: 1-2% of account per trade</p>
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
function SessionStatus() {
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

export default function ScalpingV2Page() {
    const [signals, setSignals] = useState<ScalpingV2Signal[]>([]);
    const [runningSignals, setRunningSignals] = useState<ScalpingV2Signal[]>([]);
    const [activeTab, setActiveTab] = useState<'NEW' | 'RUNNING'>('NEW');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState<'CRYPTO' | null>(null);
    const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [nextScanTime, setNextScanTime] = useState<number>(60);
    const [scannedPairs, setScannedPairs] = useState<string[]>([]);
    const [isPairsOpen, setIsPairsOpen] = useState(false);
    const [newPairInput, setNewPairInput] = useState('');
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
                        localStorage.setItem('cryptoPushSubscribed', 'true');
                    }
                }
            }
        };

        const savedSub = localStorage.getItem('cryptoPushSubscribed') === 'true';
        if (savedSub) {
            autoSubscribe();
        } else {
            setIsSubscribed(false);
        }
    }, []);

    const handleSubscribe = async () => {
        if (isSubscribed) {
            setIsSubscribed(false);
            localStorage.setItem('cryptoPushSubscribed', 'false');
        } else {
            try {
                const token = await requestNotificationPermission();
                if (token) {
                    setIsSubscribed(true);
                    localStorage.setItem('cryptoPushSubscribed', 'true');
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
            const savedNew = localStorage.getItem('v2NewSetups');
            const savedRunning = localStorage.getItem('v2RunningTrades');
            if (savedNew) setSignals(JSON.parse(savedNew));
            if (savedRunning) setRunningSignals(JSON.parse(savedRunning));

            const savedPairs = localStorage.getItem('v2ScannedPairs');
            if (savedPairs) {
                setScannedPairs(JSON.parse(savedPairs));
            } else {
                setScannedPairs(CRYPTO_PAIRS);
            }
        } catch (e) {
            console.error('Failed to load saved V2 signals', e);
        } finally {
            isLoadedRef.current = true;
        }
    }, []);

    // Sync to localStorage
    useEffect(() => {
        if (!isLoadedRef.current) return;
        localStorage.setItem('v2NewSetups', JSON.stringify(signals));
    }, [signals]);

    useEffect(() => {
        if (!isLoadedRef.current) return;
        localStorage.setItem('v2ScannedPairs', JSON.stringify(scannedPairs));
    }, [scannedPairs]);

    useEffect(() => {
        if (!isLoadedRef.current) return;
        localStorage.setItem('v2RunningTrades', JSON.stringify(runningSignals));
    }, [runningSignals]);

    const generateSignals = useCallback(async () => {
        setIsLoading(true);
        setScanCount(0);
        setNextScanTime(60);

        try {
            // SHIFT OLD SIGNALS: Move any existing active setups from signals list to runningSignals before scanning
            setRunningSignals(prev => {
                const activeFromCurrent = signals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING');
                // Filter out duplicates
                const uniqueNew = activeFromCurrent.filter(
                    s => !prev.some(p => p.id === s.id)
                );
                return [...prev, ...uniqueNew];
            });

            // Scan all user configured pairs for ICT setups
            const selectedPairs = scannedPairs.length > 0 ? [...scannedPairs] : [...CRYPTO_PAIRS];

            const generated = await ScalpingV2Generator.generateSignals(
                selectedPairs,
                MarketType.CRYPTO,
                SignalType.FUTURE
            );

            setScanCount(selectedPairs.length);
            setSignals(generated);
            setLastGenerated(new Date());
            setNextScanTime(60);
            setActiveTab('NEW'); // Switch to New setups tab

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
            console.error('V2 Signal generation failed:', error);
        } finally {
            setIsLoading(false);
        }
    }, [signals, scannedPairs]);

    // Auto-scan timer ticker (5 minutes / 300s)
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
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedMarket, isLoading]);

    // Clear inactive (completed or stopped) running signals
    const clearInactiveRunning = () => {
        setRunningSignals(prev => {
            const activeOnly = prev.filter(s => s.status === 'ACTIVE');
            return activeOnly;
        });
    };

    const handleAddPair = useCallback(() => {
        if (!newPairInput.trim()) return;

        let clean = newPairInput.trim().toUpperCase();
        // Remove spaces
        clean = clean.replace(/\s+/g, '');

        // Standardize format: if it is just "BTC", convert to "BTC/USDT"
        if (!clean.includes('/')) {
            // Check if it already has "USDT" at the end (e.g. BTCUSDT)
            if (clean.endsWith('USDT')) {
                clean = clean.replace('USDT', '/USDT');
            } else {
                clean = `${clean}/USDT`;
            }
        }

        // Ensure we don't add duplicates
        setScannedPairs(prev => {
            if (prev.includes(clean)) return prev;
            return [...prev, clean];
        });
        setNewPairInput('');
    }, [newPairInput]);

    const handleRemovePair = useCallback((pairToRemove: string) => {
        setScannedPairs(prev => prev.filter(p => p !== pairToRemove));
    }, []);

    // Auto-generate when market selected
    useEffect(() => {
        if (selectedMarket) {
            generateSignals();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMarket]);

    // Live price updates loop for active Scalping V2 signals
    useEffect(() => {
        if ((signals.length === 0 && runningSignals.length === 0) || isLoading) return;

        let active = true;

        const updatePricesList = async (list: ScalpingV2Signal[]) => {
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
                        const symbol = BinanceAPI.pairToBinanceSymbol(signal.pair);
                        const price = await BinanceAPI.getCurrentPrice(symbol);

                        if (price && !isNaN(price) && active) {
                            let status: ScalpingV2Signal['status'] = signal.status;
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

                            // Update candles with the latest price
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
                        // Separate signals that hit SL/TP from still-active ones
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
                console.error('Error updating live prices in loop:', error);
            }
        };

        const interval = setInterval(updatePrices, 3000);
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
                {/* Background effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
                    <div className="absolute top-20 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-amber-500/3 rounded-full blur-3xl" />
                </div>

                <div className="relative container mx-auto px-4 pt-8 pb-6">
                    {/* V2 Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center mb-6"
                    >
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 via-cyan-500/30 to-amber-500/30 rounded-2xl blur-md" />
                            <div className="relative bg-[#0a0a14]/90 border border-white/10 rounded-2xl px-4 py-3 flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-400" />
                                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-lg tracking-tight">
                                        SCALPING V2
                                    </span>
                                </div>
                                <div className="hidden md:block h-5 w-px bg-white/10" />
                                <span className="text-xs text-muted-foreground font-medium">
                                    ICT • Smart Money Concepts
                                </span>
                                <div className="hidden md:block h-5 w-px bg-white/10" />
                                <SessionStatus />
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
                                <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">
                                    Scalping Engine
                                </span>
                            </h1>
                            <p className="text-muted-foreground mb-2 max-w-lg mx-auto">
                                ICT / Smart Money Concepts based signal generation.
                                HTF: 5 Minute • LTF: 1 Minute
                            </p>
                            <p className="text-muted-foreground/60 text-sm mb-8 max-w-lg mx-auto">
                                BOS • CHoCH • Liquidity Sweeps • FVG • Order Blocks • OTE • Premium/Discount Zones
                            </p>

                            <div className="flex justify-center gap-6">
                                <motion.button
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedMarket('CRYPTO')}
                                    className="relative group"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/40 to-cyan-500/40 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative px-12 py-6 rounded-2xl bg-[#0a0a14] border border-white/10 hover:border-purple-500/30 transition-all">
                                        <span className="text-4xl mb-3 block">₿</span>
                                        <h3 className="text-lg font-bold text-white">Cryptocurrency</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Futures • Top 24 Pairs</p>
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
                                        <feat.icon className="w-5 h-5 mx-auto text-cyan-400/60 mb-1.5" />
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
                                            ? 'border-purple-500 text-purple-400'
                                            : 'border-transparent text-muted-foreground hover:text-white'
                                    }`}
                                >
                                    New Setups ({signals.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('RUNNING')}
                                    className={`px-6 py-3 border-b-2 text-sm font-bold transition-all relative ${
                                        activeTab === 'RUNNING'
                                            ? 'border-purple-500 text-purple-400'
                                            : 'border-transparent text-muted-foreground hover:text-white'
                                    }`}
                                >
                                    Running Trades ({runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length})
                                    {runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length > 0 && (
                                        <span className="absolute top-2.5 right-1.5 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Running Trades Sub-Filters */}
                            {activeTab === 'RUNNING' && (
                                <div className="flex flex-col gap-3 mb-6">
                                    <div className="flex gap-2 bg-white/[0.02] p-1.5 rounded-xl border border-white/5 w-fit">
                                        {[
                                            { key: 'ACTIVE', label: 'Active / Pending', count: runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length, color: 'text-cyan-400' },
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
                                            color: 'text-cyan-400',
                                            bg: 'bg-cyan-500/10'
                                        },
                                        {
                                            label: 'Elite Setups',
                                            value: signals.filter(s => s.score.grade === 'ELITE').length,
                                            icon: Star,
                                            color: 'text-yellow-400',
                                            bg: 'bg-yellow-500/10'
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
                                            color: 'text-purple-400',
                                            bg: 'bg-purple-500/10'
                                        },
                                        {
                                            label: 'Active / Pending',
                                            value: runningSignals.filter(s => s.status === 'ACTIVE' || s.status === 'PENDING').length,
                                            icon: Activity,
                                            color: 'text-cyan-400',
                                            bg: 'bg-cyan-500/10'
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

                            {/* Manage Pairs Card */}
                            <div className="mb-6 rounded-2xl border border-white/5 bg-[#0a0a14]/60 backdrop-blur-xl overflow-hidden p-4">
                                <button
                                    onClick={() => setIsPairsOpen(!isPairsOpen)}
                                    className="flex items-center justify-between w-full text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-white transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-cyan-400" />
                                        Manage Scan Pairs ({scannedPairs.length})
                                    </span>
                                    <span>{isPairsOpen ? 'Hide Config' : 'Show Config'}</span>
                                </button>
                                
                                {isPairsOpen && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                                        {/* Add Pair Form */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                                            {/* Dropdown Selector */}
                                            <div className="flex flex-col gap-1">
                                                <select
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) {
                                                            setScannedPairs(prev => {
                                                                if (prev.includes(val)) return prev;
                                                                return [...prev, val];
                                                            });
                                                            e.target.value = ''; // Reset select dropdown
                                                        }
                                                    }}
                                                    className="w-full px-4 py-2 text-sm rounded-xl bg-[#0a0a14] border border-white/10 text-white focus:border-purple-500/50 focus:outline-none transition-all cursor-pointer h-[38px]"
                                                >
                                                    <option value="" className="text-muted-foreground">-- Select a Coin to Add --</option>
                                                    {POPULAR_COINS.map(coin => {
                                                        const isAlreadyAdded = scannedPairs.includes(coin);
                                                        return (
                                                            <option 
                                                                key={coin} 
                                                                value={coin} 
                                                                disabled={isAlreadyAdded}
                                                                className="text-white disabled:text-muted-foreground/40"
                                                            >
                                                                {coin} {isAlreadyAdded ? '(Added)' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <span className="text-[10px] text-muted-foreground/60 px-1">Quick-select popular coins</span>
                                            </div>

                                            {/* Custom Input */}
                                            <div className="flex flex-col gap-1">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. SOL, BNB/USDT"
                                                        value={newPairInput}
                                                        onChange={(e) => setNewPairInput(e.target.value)}
                                                        className="flex-1 px-4 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-muted-foreground/50 focus:border-purple-500/50 focus:outline-none transition-colors h-[38px]"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddPair();
                                                        }}
                                                    />
                                                    <button
                                                        onClick={handleAddPair}
                                                        className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-all shrink-0 h-[38px]"
                                                    >
                                                        Add Custom
                                                    </button>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground/60 px-1">Or type any custom USDT pair</span>
                                            </div>
                                        </div>

                                        {/* Chips Grid */}
                                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {scannedPairs.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic">No pairs configured. Scanning falls back to default 24 pairs.</p>
                                            )}
                                            {scannedPairs.map((pair) => (
                                                <div
                                                    key={pair}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/90"
                                                >
                                                    <span>{pair}</span>
                                                    <button
                                                        onClick={() => handleRemovePair(pair)}
                                                        className="p-0.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t border-white/5">
                                            <span>Enter any Binance Spot/Futures USDT pair.</span>
                                            <button
                                                onClick={() => setScannedPairs(CRYPTO_PAIRS)}
                                                className="hover:text-white transition-colors text-purple-400 font-bold"
                                            >
                                                Reset to Default 24 Coins
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-sm disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20 transition-all w-full sm:w-auto"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                                {isLoading ? 'Scanning Markets...' : 'Re-Scan Markets'}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleSubscribe}
                                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all w-full sm:w-auto ${
                                                    isSubscribed
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                                                }`}
                                            >
                                                {isSubscribed ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-purple-400 animate-pulse" />}
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
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                                </span>
                                                <span className="text-xs font-semibold font-mono text-cyan-400">
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
                                    ← Change Market
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
                                        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
                                        <div className="absolute inset-0 rounded-full border-2 border-t-purple-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin" />
                                        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                        <Zap className="absolute inset-0 m-auto w-6 h-6 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Scanning with ICT Engine</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Analyzing market structure, liquidity, order blocks, FVGs...
                                    </p>
                                    <div className="flex justify-center gap-2 mt-4">
                                        {['BOS', 'CHoCH', 'FVG', 'OB', 'OTE', 'Liquidity'].map((term, i) => (
                                            <motion.span
                                                key={term}
                                                initial={{ opacity: 0.3 }}
                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                                                className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-muted-foreground font-mono"
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
                                        <ICTSignalCard key={signal.id} signal={signal} index={idx} />
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
                                    <h3 className="text-lg font-bold text-white mb-2">No Elite/A+ Setups Found</h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        The ICT engine requires all conditions to be met for high-quality signals.
                                        Market structure, liquidity sweeps, or session conditions may not be optimal right now.
                                    </p>
                                    <button
                                        onClick={generateSignals}
                                        className="mt-6 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all"
                                    >
                                        <RefreshCw className="w-4 h-4 inline mr-2" />
                                        Re-Scan Markets
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
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                                        {runningSubFilter === 'ACTIVE' && <Layers className="w-8 h-8 text-purple-400" />}
                                        {runningSubFilter === 'COMPLETED' && <Check className="w-8 h-8 text-emerald-400" />}
                                        {runningSubFilter === 'STOPPED' && <AlertTriangle className="w-8 h-8 text-rose-400" />}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {runningSubFilter === 'ACTIVE' && 'No Active Trades'}
                                        {runningSubFilter === 'COMPLETED' && 'No TP Hit Trades'}
                                        {runningSubFilter === 'STOPPED' && 'No SL Hit Trades'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                        {runningSubFilter === 'ACTIVE' && 'There are no active running trades currently in play.'}
                                        {runningSubFilter === 'COMPLETED' && 'No trades have reached their Take Profit targets in this session.'}
                                        {runningSubFilter === 'STOPPED' && 'No trades have hit their Stop Loss limits in this session.'}
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
