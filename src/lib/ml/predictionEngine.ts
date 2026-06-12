// Unified Prediction Engine
// Combines ML, Pattern Recognition, and Technical Analysis

import { PredictiveModel } from './predictiveModel';
import { CandlestickPatternDetector } from '../patterns/candlestickPatterns';
import { PatternPredictor } from '../patterns/patternPredictor';
import {
    MLPrediction,
    CandlestickPattern,
    NextCandlePrediction,
    PredictionConsensus,
    Timeframe,
    OrderBookDepth
} from '../signals/types';

export interface PredictionInput {
    prices: number[];
    volumes: number[];
    rsi: number;
    macd: number;
    currentPrice: number;
    timeframe: Timeframe;
    technicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    technicalConfidence: number;
    orderBookDepth?: OrderBookDepth;
}

export class PredictionEngine {
    private static initialized = false;

    /**
     * Initialize the prediction engine
     */
    static async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await PredictiveModel.initialize();
            this.initialized = true;
            console.log('✅ Prediction Engine initialized');
        } catch (error) {
            console.error('Failed to initialize Prediction Engine:', error);
        }
    }

    /**
     * Generate comprehensive prediction using all available sources
     * @param input Prediction input data
     * @returns Complete prediction with consensus
     */
    static async generatePrediction(input: PredictionInput): Promise<{
        mlPrediction: MLPrediction;
        detectedPatterns: CandlestickPattern[];
        nextCandlePrediction: NextCandlePrediction;
        predictionConsensus: PredictionConsensus;
    } | null> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // 1. ML Prediction
            const mlPrediction = await PredictiveModel.predict(
                input.prices,
                input.volumes,
                input.rsi,
                input.macd,
                input.currentPrice,
                input.timeframe
            );

            // 2. Pattern Detection
            const detectedPatterns = CandlestickPatternDetector.detectPatterns(
                input.prices,
                input.volumes
            );

            // 3. Pattern-based Prediction
            const avgRange = this.calculateAverageRange(input.prices.slice(-30));
            let nextCandlePrediction: NextCandlePrediction;

            if (detectedPatterns.length > 0) {
                const patternPrediction = PatternPredictor.predictNextCandle(
                    detectedPatterns,
                    input.currentPrice,
                    avgRange
                );

                if (patternPrediction) {
                    // Combine with technicals
                    nextCandlePrediction = PatternPredictor.combineWithTechnicals(
                        patternPrediction,
                        input.technicalBias,
                        input.technicalConfidence
                    );
                } else {
                    nextCandlePrediction = this.createBasicPrediction(
                        input.currentPrice,
                        avgRange,
                        input.technicalBias,
                        input.technicalConfidence
                    );
                }
            } else {
                nextCandlePrediction = this.createBasicPrediction(
                    input.currentPrice,
                    avgRange,
                    input.technicalBias,
                    input.technicalConfidence
                );
            }

            // 4. Create Prediction Consensus
            const predictionConsensus = this.createConsensus(
                mlPrediction,
                detectedPatterns,
                nextCandlePrediction,
                input.technicalBias,
                input.technicalConfidence,
                input.orderBookDepth
            );

            return {
                mlPrediction,
                detectedPatterns,
                nextCandlePrediction,
                predictionConsensus
            };
        } catch (error) {
            console.error('Prediction generation error:', error);
            return null;
        }
    }

    /**
     * Create prediction consensus from all sources
     */
    private static createConsensus(
        mlPrediction: MLPrediction,
        patterns: CandlestickPattern[],
        nextCandlePrediction: NextCandlePrediction,
        technicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
        technicalConfidence: number,
        orderBookDepth?: OrderBookDepth
    ): PredictionConsensus {
        // Assign weights based on availability and reliability
        let mlWeight = 0;
        let patternWeight = 0;
        let technicalWeight = 0;
        let orderBookWeight = 0;

        // ML weight (if model has good accuracy)
        if (mlPrediction.modelAccuracy && mlPrediction.modelAccuracy > 60) {
            mlWeight = (mlPrediction.modelAccuracy / 100) * 0.3; // Max 30%
        }

        // Pattern weight (based on number and strength of patterns)
        if (patterns.length > 0) {
            const avgStrength = patterns.reduce((sum, p) => sum + p.strength, 0) / patterns.length;
            patternWeight = (avgStrength / 100) * 0.3; // Max 30%
        }

        // Technical weight
        technicalWeight = (technicalConfidence / 100) * 0.4; // Max 40%

        // Order Book weight
        if (orderBookDepth) {
            orderBookWeight = 0.2; // 20% weight
        }

        // Normalize weights to sum to 1
        const totalWeight = mlWeight + patternWeight + technicalWeight + orderBookWeight;
        if (totalWeight > 0) {
            mlWeight /= totalWeight;
            patternWeight /= totalWeight;
            technicalWeight /= totalWeight;
            orderBookWeight /= totalWeight;
        }

        // Calculate weighted scores
        let bullishScore = 0;
        let bearishScore = 0;

        // ML contribution
        if (mlPrediction.direction === 'UP') {
            bullishScore += (mlPrediction.confidence / 100) * mlWeight;
        } else if (mlPrediction.direction === 'DOWN') {
            bearishScore += (mlPrediction.confidence / 100) * mlWeight;
        }

        // Pattern contribution
        bullishScore += (nextCandlePrediction.bullishProbability / 100) * patternWeight;
        bearishScore += (nextCandlePrediction.bearishProbability / 100) * patternWeight;

        // Technical contribution
        if (technicalBias === 'BULLISH') {
            bullishScore += (technicalConfidence / 100) * technicalWeight;
        } else if (technicalBias === 'BEARISH') {
            bearishScore += (technicalConfidence / 100) * technicalWeight;
        } else {
            // Neutral - distribute equally
            bullishScore += 0.5 * technicalWeight;
            bearishScore += 0.5 * technicalWeight;
        }

        // Order Book contribution
        if (orderBookDepth) {
            if (orderBookDepth.imbalance === 'BUY') {
                bullishScore += (orderBookDepth.buyPressure / 100) * orderBookWeight;
            } else if (orderBookDepth.imbalance === 'SELL') {
                bearishScore += (orderBookDepth.sellPressure / 100) * orderBookWeight;
            } else {
                // Neutral imbalance - distribute based on actual buy/sell pressure
                bullishScore += (orderBookDepth.buyPressure / 100) * orderBookWeight;
                bearishScore += (orderBookDepth.sellPressure / 100) * orderBookWeight;
            }
        }

        // Determine overall direction
        let overallDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        if (bullishScore > bearishScore * 1.2) {
            overallDirection = 'BULLISH';
        } else if (bearishScore > bullishScore * 1.2) {
            overallDirection = 'BEARISH';
        } else {
            overallDirection = 'NEUTRAL';
        }

        // Calculate overall confidence
        const confidence = Math.round(Math.max(bullishScore, bearishScore) * 100);

        // Calculate agreement (how much sources agree)
        const agreements: number[] = [];
        if (mlWeight > 0) {
            const mlAgrees = (mlPrediction.direction === 'UP' && overallDirection === 'BULLISH') ||
                (mlPrediction.direction === 'DOWN' && overallDirection === 'BEARISH');
            agreements.push(mlAgrees ? 1 : 0);
        }
        if (patternWeight > 0) {
            const patternAgrees = (nextCandlePrediction.bullishProbability > nextCandlePrediction.bearishProbability && overallDirection === 'BULLISH') ||
                (nextCandlePrediction.bearishProbability > nextCandlePrediction.bullishProbability && overallDirection === 'BEARISH');
            agreements.push(patternAgrees ? 1 : 0);
        }
        if (technicalWeight > 0) {
            const technicalAgrees = technicalBias === overallDirection;
            agreements.push(technicalAgrees ? 1 : 0);
        }
        if (orderBookWeight > 0 && orderBookDepth) {
            const obAgrees = (orderBookDepth.imbalance === 'BUY' && overallDirection === 'BULLISH') ||
                (orderBookDepth.imbalance === 'SELL' && overallDirection === 'BEARISH') ||
                (orderBookDepth.imbalance === 'NEUTRAL' && overallDirection === 'NEUTRAL');
            agreements.push(obAgrees ? 1 : 0);
        }

        const agreement = agreements.length > 0
            ? Math.round((agreements.reduce((a, b) => a + b, 0) / agreements.length) * 100)
            : 50;

        // Identify conflicting signals
        const conflictingSignals: string[] = [];
        if (mlWeight > 0 && mlPrediction.direction !== 'NEUTRAL') {
            const mlDirection = mlPrediction.direction === 'UP' ? 'BULLISH' : 'BEARISH';
            if (mlDirection !== overallDirection) {
                conflictingSignals.push(`ML predicts ${mlPrediction.direction} (${mlPrediction.confidence}%)`);
            }
        }
        if (patterns.length > 0) {
            const dominantPatternSentiment = nextCandlePrediction.bullishProbability > nextCandlePrediction.bearishProbability ? 'BULLISH' : 'BEARISH';
            if (dominantPatternSentiment !== overallDirection) {
                conflictingSignals.push(`Patterns suggest ${dominantPatternSentiment}`);
            }
        }
        if (technicalBias !== 'NEUTRAL' && technicalBias !== overallDirection) {
            conflictingSignals.push(`Technicals are ${technicalBias}`);
        }
        if (orderBookWeight > 0 && orderBookDepth) {
            const obDirection = orderBookDepth.imbalance === 'BUY' ? 'BULLISH' : (orderBookDepth.imbalance === 'SELL' ? 'BEARISH' : 'NEUTRAL');
            if (obDirection !== 'NEUTRAL' && obDirection !== overallDirection) {
                conflictingSignals.push(`Order Book shows ${orderBookDepth.imbalance} imbalance (${Math.round(orderBookDepth.buyPressure)}% Buy vs ${Math.round(orderBookDepth.sellPressure)}% Sell)`);
            }
        }

        return {
            overallDirection,
            confidence,
            mlWeight: Math.round(mlWeight * 100),
            patternWeight: Math.round(patternWeight * 100),
            technicalWeight: Math.round(technicalWeight * 100),
            orderBookWeight: Math.round(orderBookWeight * 100),
            agreement,
            conflictingSignals
        };
    }

    /**
     * Create basic prediction when no patterns detected
     */
    private static createBasicPrediction(
        currentPrice: number,
        avgRange: number,
        technicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
        technicalConfidence: number
    ): NextCandlePrediction {
        let bullishProbability = 50;
        let bearishProbability = 50;

        if (technicalBias === 'BULLISH') {
            bullishProbability = technicalConfidence;
            bearishProbability = 100 - technicalConfidence;
        } else if (technicalBias === 'BEARISH') {
            bearishProbability = technicalConfidence;
            bullishProbability = 100 - technicalConfidence;
        }

        const expectedMove = avgRange * 0.5;
        const expectedHigh = currentPrice + expectedMove;
        const expectedLow = currentPrice - expectedMove;
        const expectedClose = bullishProbability > bearishProbability
            ? currentPrice + (expectedMove * 0.5)
            : currentPrice - (expectedMove * 0.5);

        const dominantProb = Math.max(bullishProbability, bearishProbability);
        const confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
            dominantProb >= 70 ? 'HIGH' : dominantProb >= 55 ? 'MEDIUM' : 'LOW';

        return {
            bullishProbability,
            bearishProbability,
            neutralProbability: Math.max(0, 100 - bullishProbability - bearishProbability),
            expectedHigh,
            expectedLow,
            expectedClose,
            volatilityExpansion: false,
            breakoutLikely: false,
            confidenceLevel,
            predictionSources: [`Technical Analysis (${technicalBias} ${technicalConfidence}%)`]
        };
    }

    /**
     * Calculate average price range
     */
    private static calculateAverageRange(prices: number[]): number {
        if (prices.length < 2) return prices[0] * 0.01; // 1% fallback

        const ranges: number[] = [];
        for (let i = 1; i < prices.length; i++) {
            ranges.push(Math.abs(prices[i] - prices[i - 1]));
        }

        return ranges.reduce((a, b) => a + b, 0) / ranges.length;
    }

    /**
     * Get prediction engine status
     */
    static getStatus(): {
        initialized: boolean;
        modelStatus: { loaded: boolean; training: boolean; accuracy: number; version: string };
    } {
        return {
            initialized: this.initialized,
            modelStatus: PredictiveModel.getModelStatus()
        };
    }
}
