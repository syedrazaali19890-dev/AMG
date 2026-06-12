// Next Candle Prediction Display Component
// Shows ML prediction and probability gauge

'use client';

import { NextCandlePrediction, PredictionConsensus } from '@/lib/signals/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PredictionDisplayProps {
    nextCandlePrediction?: NextCandlePrediction;
    predictionConsensus?: PredictionConsensus;
}

export function PredictionDisplay({ nextCandlePrediction, predictionConsensus }: PredictionDisplayProps) {
    if (!nextCandlePrediction) return null;

    const { bullishProbability, bearishProbability, confidenceLevel, expectedHigh, expectedLow, breakoutLikely } = nextCandlePrediction;

    // Determine dominant direction
    const dominant = bullishProbability > bearishProbability ? 'bullish' : 'bearish';
    const dominantProb = Math.max(bullishProbability, bearishProbability);

    return (
        <div className="mt-4 p-4 glass rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Next Candle Prediction
            </h4>

            {/* Probability Bars */}
            <div className="space-y-2 mb-3">
                {/* Bullish Bar */}
                <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <span className="text-muted-foreground">Bullish</span>
                        </span>
                        <span className="font-semibold text-green-500">{bullishProbability}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                            style={{ width: `${bullishProbability}%` }}
                        />
                    </div>
                </div>

                {/* Bearish Bar */}
                <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-500" />
                            <span className="text-muted-foreground">Bearish</span>
                        </span>
                        <span className="font-semibold text-red-500">{bearishProbability}%</span>
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                            style={{ width: `${bearishProbability}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Expected Price Range */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-background/50 rounded">
                    <div className="text-muted-foreground mb-1">Expected High</div>
                    <div className="font-semibold text-green-500">${expectedHigh.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-background/50 rounded">
                    <div className="text-muted-foreground mb-1">Expected Low</div>
                    <div className="font-semibold text-red-500">${expectedLow.toLocaleString()}</div>
                </div>
            </div>

            {/* Confidence & Alerts */}
            <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded font-semibold ${confidenceLevel === 'HIGH' ? 'bg-green-500/20 text-green-500' :
                            confidenceLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-gray-500/20 text-gray-500'
                        }`}>
                        {confidenceLevel} CONFIDENCE
                    </span>
                    {breakoutLikely && (
                        <span className="px-2 py-1 rounded font-semibold bg-purple-500/20 text-purple-500 animate-pulse">
                            ⚡ BREAKOUT LIKELY
                        </span>
                    )}
                </div>
            </div>

            {/* Prediction Sources */}
            {predictionConsensus && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="text-xs text-muted-foreground mb-2">Prediction Sources:</div>
                    <div className="flex flex-wrap gap-2">
                        {predictionConsensus.mlWeight > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">ML:</span>
                                <span className="font-semibold">{predictionConsensus.mlWeight}%</span>
                            </div>
                        )}
                        {predictionConsensus.patternWeight > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Patterns:</span>
                                <span className="font-semibold">{predictionConsensus.patternWeight}%</span>
                            </div>
                        )}
                        {predictionConsensus.technicalWeight > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Technicals:</span>
                                <span className="font-semibold">{predictionConsensus.technicalWeight}%</span>
                            </div>
                        )}
                        {predictionConsensus.orderBookWeight > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Order Book:</span>
                                <span className="font-semibold">{predictionConsensus.orderBookWeight}%</span>
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">Agreement:</span>
                            <span className={`font-semibold ${predictionConsensus.agreement >= 80 ? 'text-green-500' :
                                    predictionConsensus.agreement >= 60 ? 'text-yellow-500' :
                                        'text-red-500'
                                }`}>
                                {predictionConsensus.agreement}%
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
