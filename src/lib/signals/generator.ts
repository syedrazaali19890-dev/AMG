// Signal Generator - Advanced Trading Signal Generation
// Enhanced with Macro Economic Data Integration (Fed Rate, CPI, NFP, FOMC)

import {
    Signal,
    SignalType,
    SignalDirection,
    SignalStatus,
    MarketType,
    MarketData,
    Timeframe,
    MarketCondition,
    TechnicalAlignment,
    MacroSignalBias
} from './types';
import { TechnicalIndicators } from './indicators';
import { NewsAnalyzer } from './newsAnalyzer';
import { AdvancedMarketAnalyzer, MarketAnalysis } from './advancedAnalyzer';
import { SignalHelpers } from './signalHelpers';
import { PredictionEngine } from '../ml/predictionEngine';
import { MultiTimeframeAnalyzer } from '../timeframe/multiTimeframeAnalyzer';
import { ExchangeAvailability } from './exchangeAvailability';
import { MacroAnalyzer } from './macroAnalyzer';
import {
    calculatePortfolioAllocation,
    calculateHoldTime,
    calculateVolumeQuality,
    getCoinStability,
    generateBeginnerTip
} from './spotEnhancements';


export class SignalGenerator {
    private static predictionEngineInitialized = false;

    // Trading Profile Constants - Balanced Quality vs Quantity
    private static readonly SPOT_PROFILE = {
        minConfidence: 70,        // SPOT: 70% minimum (balanced for quality)
        riskLevel: 'MODERATE' as const
    };

    private static readonly FUTURES_PROFILE = {
        minConfidence: 72,        // FUTURES: 72% minimum (balanced for quality)
        riskLevel: 'HIGH' as const
    };

    /**
     * Initialize prediction engine (call once on app start)
     */
    static async initializePrediction(): Promise<void> {
        if (!this.predictionEngineInitialized) {
            await PredictionEngine.initialize();
            this.predictionEngineInitialized = true;
            console.log('✅ Predictive AI Engine Ready');
        }
    }
    /**
     * Generate trading signal with news + technical confirmation
     * Enhanced with real-time news analysis
     * @param marketData Market data for analysis
     * @param signalType Type of signal (SPOT/FUTURE)
     * @param timeframe Candlestick timeframe for the signal
     * @returns Generated signal or null
     */
    static async generateSignal(
        marketData: MarketData,
        signalType: SignalType,
        timeframe: Timeframe = Timeframe.ONE_HOUR
    ): Promise<Signal | null> {
        const { prices, volumes, pair, marketType, currentPrice } = marketData;

        // ============================================
        // STEP 0: MACRO ECONOMIC DATA CHECK
        // Read macro data FIRST, then decide if signal should be generated
        // ============================================
        let macroBias: MacroSignalBias | undefined;
        try {
            macroBias = await MacroAnalyzer.getMacroBias();

            // Block signal generation during extreme events (e.g., FOMC day)
            if (!macroBias.shouldGenerateSignals) {
                console.log(`🚫 Macro block: Signals paused — ${macroBias.rationale[macroBias.rationale.length - 1] || 'Extreme macro event'}`);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Macro data unavailable, proceeding without macro bias:', error);
            // Continue without macro — don't block signals if macro API fails
        }

        // COMPREHENSIVE PRICE VALIDATION
        // Filter out invalid prices that would show as 0.0000 or cause errors
        if (!currentPrice || isNaN(currentPrice) || !isFinite(currentPrice) || currentPrice <= 0) {
            console.log(`⚠️ Skipping ${pair} - invalid price (${currentPrice})`);
            return null;
        }

        // Reject extremely low-priced coins (< $0.0001)
        // These display as 0.0000 and create confusing signals
        if (currentPrice < 0.0001) {
            console.log(`⚠️ Skipping ${pair} - price too low (${currentPrice})`);
            return null;
        }

        // Calculate all technical indicators
        const rsi = TechnicalIndicators.calculateRSI(prices);
        const macd = TechnicalIndicators.calculateMACD(prices);
        const bollingerBands = TechnicalIndicators.calculateBollingerBands(prices);
        const ema9 = TechnicalIndicators.calculateEMA(prices, 9);
        const ema21 = TechnicalIndicators.calculateEMA(prices, 21);
        const ema50 = TechnicalIndicators.calculateEMA(prices, 50);
        const trend = TechnicalIndicators.determineTrend(prices);
        const volumeAvg = TechnicalIndicators.calculateVolumeAverage(volumes);
        const currentVolume = volumes[volumes.length - 1];

        // HYBRID STRATEGY: Calculate Momentum & ROC
        const momentum = this.calculateMomentum(prices, 10);
        const roc = this.calculateROC(prices, 10);

        // Signal scoring system (HYBRID APPROACH)
        let buyScore = 0;
        let sellScore = 0;

        // === MEAN REVERSION SIGNALS (Reversal Trading) ===

        // RSI Analysis with Momentum Confirmation
        if (rsi < 30 && momentum > -1.0) {
            // Oversold + momentum slowing = SAFE reversal entry
            buyScore += 25;
        } else if (rsi < 40 && momentum > -0.5) {
            // Slightly oversold + momentum improving
            buyScore += 15;
        } else if (rsi > 70 && momentum < 1.0) {
            // Overbought + momentum slowing = SAFE reversal SHORT
            sellScore += 25;
        } else if (rsi > 60 && momentum < 0.5) {
            // Slightly overbought + momentum weakening
            sellScore += 15;
        }

        // === MOMENTUM TRADING SIGNALS (Trend Following) ===

        // Strong Downtrend Detection
        if (momentum < -2 && roc < -3) {
            // Strong bearish momentum = Follow with SHORT
            sellScore += 25;
        } else if (momentum < -1 && roc < -2) {
            // Moderate bearish momentum
            sellScore += 15;
        }

        // Strong Uptrend Detection
        if (momentum > 2 && roc > 3) {
            // Strong bullish momentum = Follow with LONG
            buyScore += 25;
        } else if (momentum > 1 && roc > 2) {
            // Moderate bullish momentum
            buyScore += 15;
        }

        // MACD Analysis (works for both strategies)
        if (macd.histogram > 0 && macd.macd > macd.signal) buyScore += 20;
        else if (macd.histogram < 0 && macd.macd < macd.signal) sellScore += 20;

        // Bollinger Bands Analysis
        if (currentPrice <= bollingerBands.lower && momentum > -1) {
            // At lower band + momentum not accelerating down = SAFE reversal
            buyScore += 20;
        } else if (currentPrice >= bollingerBands.upper) {
            // At upper band = potential SHORT
            sellScore += 20;
        }

        // EMA Trend Analysis
        if (trend === 'BULLISH') buyScore += 15;
        else if (trend === 'BEARISH') sellScore += 15;

        // Volume Confirmation
        if (currentVolume > volumeAvg * 1.5) {
            if (buyScore > sellScore) buyScore += 10;
            else if (sellScore > buyScore) sellScore += 10;
        }

        // Price action relative to EMAs
        if (currentPrice > ema9 && currentPrice > ema21) buyScore += 10;
        else if (currentPrice < ema9 && currentPrice < ema21) sellScore += 10;

        // === SAFETY CHECK: Prevent Falling Knife & Rising Rocket ===
        // If strong downward momentum, DON'T give reversal LONG signals
        if (momentum < -2.5 && roc < -4) {
            // Falling knife detected - remove reversal buy signals
            if (rsi < 40) {
                buyScore = Math.max(0, buyScore - 30); // Reduce buy score significantly
            }
        }

        // If strong upward momentum, DON'T give reversal SHORT signals (SYMMETRIC CHECK)
        if (momentum > 2.5 && roc > 4) {
            // Rising rocket detected - remove reversal sell signals
            if (rsi > 60) {
                sellScore = Math.max(0, sellScore - 30); // Reduce sell score significantly
            }
        }

        // Determine if signal is strong enough
        // Balanced thresholds for quality signals (10-15 per generation)
        // Moderate increase for better accuracy without over-filtering
        const BUY_THRESHOLD = 58;   // Balanced: not too strict, not too loose
        const SELL_THRESHOLD = 58;  // Equal treatment for both directions
        let direction: SignalDirection | null = null;
        let technicalConfidence = 0;

        // PULLBACK CONFIRMATION: Check if price has pulled back from recent high
        // This prevents buying at local tops
        const recentHighs = prices.slice(-10); // Last 10 candles
        const recentHigh = Math.max(...recentHighs);
        const pullbackPercent = ((recentHigh - currentPrice) / recentHigh) * 100;

        // For LONG/BUY: require at least 0.5% pullback from recent high
        // Upper bound removed so it can catch deeper oversold opportunities
        const hasPullback = pullbackPercent >= 0.5;

        if (buyScore >= BUY_THRESHOLD && buyScore > sellScore) {
            // LONG/BUY signals require pullback confirmation
            if (hasPullback) {
                direction = signalType === SignalType.FUTURE ? SignalDirection.LONG : SignalDirection.BUY;
                technicalConfidence = Math.min(buyScore, 100);
            } else {
                // Skip signal - price at or near local top
                return null;
            }
        } else if (sellScore >= SELL_THRESHOLD && sellScore > buyScore) {
            // SPOT: Skip SELL signals (only BUY makes sense in spot trading)
            if (signalType === SignalType.SPOT) {
                return null; // No SELL signals for SPOT
            }
            direction = signalType === SignalType.FUTURE ? SignalDirection.SHORT : SignalDirection.SELL;
            technicalConfidence = Math.min(sellScore, 100);
        }

        // No signal if not strong enough
        if (!direction) return null;

        // Generate advanced market analysis
        const advancedAnalysis = AdvancedMarketAnalyzer.generateAnalysis(
            pair,
            currentPrice,
            prices,
            volumes
        );

        // Check if this is a counter-trend signal
        const isCounterTrend = this.isCounterTrendSignal(direction, advancedAnalysis.trend);

        // === ASYNC NEWS INTEGRATION ===
        // Get real-time news impact (last 2 hours)
        const newsImpact = await NewsAnalyzer.getNewsImpactAssessment(pair);
        const newsImpactScore = newsImpact.score; // -5 to +5

        // Calculate sentiment score (news + economic events)
        const technicalScore = (direction === SignalDirection.BUY || direction === SignalDirection.LONG) ? buyScore : sellScore;
        const sentimentScore = await NewsAnalyzer.calculateSentimentScore(pair, technicalScore);

        // Combine technical and fundamental analysis
        // Technical: 60%, News: 20%, Economic: 20%
        let finalConfidence = (technicalConfidence * 0.6) +
            (Math.max(0, sentimentScore.news + 100) / 2 * 0.2) +
            (Math.max(0, sentimentScore.economic + 100) / 2 * 0.2);

        // Use sentiment only for confirmation, not contradiction
        // Boost confidence when sentiment aligns with technical signal
        if (sentimentScore.overall > 30 && (direction === SignalDirection.BUY || direction === SignalDirection.LONG)) {
            // Bullish news confirms buy signal - boost confidence
            finalConfidence = Math.min(finalConfidence * 1.15, 100);
        } else if (sentimentScore.overall < -30 && (direction === SignalDirection.SELL || direction === SignalDirection.SHORT)) {
            // Bearish news confirms sell signal - boost confidence (SAME as bullish)
            finalConfidence = Math.min(finalConfidence * 1.15, 100);
        } else if (Math.abs(sentimentScore.overall) > 40 &&
            ((sentimentScore.overall > 0 && (direction === SignalDirection.SELL || direction === SignalDirection.SHORT)) ||
                (sentimentScore.overall < 0 && (direction === SignalDirection.BUY || direction === SignalDirection.LONG)))) {
            // Strong sentiment contradicts technical - slightly reduce confidence but don't invert
            finalConfidence *= 0.85;
        }

        let confidence = Math.round(Math.max(0, Math.min(100, finalConfidence)));

        // ============================================
        // STEP 2: APPLY MACRO ECONOMIC BIAS TO CONFIDENCE
        // ============================================
        if (macroBias) {
            // Get market-specific confidence modifier
            const macroModifier = MacroAnalyzer.getMarketSpecificModifier(macroBias, marketType);

            // Check if signal direction aligns with macro bias
            const directionStr = direction as string;
            const isAligned = MacroAnalyzer.isDirectionAligned(
                macroBias,
                directionStr as 'BUY' | 'SELL' | 'LONG' | 'SHORT',
                marketType
            );

            if (isAligned) {
                // Signal aligns with macro — boost confidence
                confidence = Math.round(Math.min(100, confidence + Math.abs(macroModifier)));
                console.log(`📊 Macro ALIGNED: ${pair} ${direction} confidence +${Math.abs(macroModifier)} → ${confidence}%`);
            } else {
                // Signal conflicts with macro — reduce confidence
                confidence = Math.round(Math.max(0, confidence - Math.abs(macroModifier) * 0.7));
                console.log(`📊 Macro CONFLICT: ${pair} ${direction} confidence -${Math.round(Math.abs(macroModifier) * 0.7)} → ${confidence}%`);
            }

            // During HIGH/EXTREME volatility, require higher minimum confidence
            if (macroBias.volatilityExpected === 'EXTREME' && confidence < 80) {
                console.log(`⚠️ Rejecting ${pair} — Extreme macro volatility requires 80%+ confidence (got ${confidence}%)`);
                return null;
            }
            if (macroBias.volatilityExpected === 'HIGH' && confidence < 75) {
                console.log(`⚠️ Rejecting ${pair} — High macro volatility requires 75%+ confidence (got ${confidence}%)`);
                return null;
            }
        }

        // Counter-trend signals require higher confidence (80%)
        if (isCounterTrend && confidence < 80) {
            return null; // Reject weak counter-trend signals (higher risk)
        }

        // Profile-based confidence threshold
        const profile = signalType === SignalType.SPOT ? this.SPOT_PROFILE : this.FUTURES_PROFILE;

        // SPOT: 60% minimum, FUTURES: 70% minimum
        if (confidence < profile.minConfidence) {
            return null; // Signal doesn't meet quality threshold for this type
        }

        // ============================================
        // PREDICTIVE AI INTEGRATION
        // ============================================

        // Determine technical bias for prediction engine
        const technicalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
            (direction === SignalDirection.BUY || direction === SignalDirection.LONG) ? 'BULLISH' :
                (direction === SignalDirection.SELL || direction === SignalDirection.SHORT) ? 'BEARISH' : 'NEUTRAL';

        // Generate comprehensive predictions (ML + Patterns + Multi-Timeframe)
        let mlPrediction = undefined;
        let detectedPatterns = undefined;
        let nextCandlePrediction = undefined;
        let predictionConsensus = undefined;
        let timeframeAlignment = undefined;

        try {
            // Initialize prediction engine if not already done
            await this.initializePrediction();

            // Generate predictions using unified engine
            const predictions = await PredictionEngine.generatePrediction({
                prices,
                volumes,
                rsi,
                macd: macd.macd,
                currentPrice,
                timeframe,
                technicalBias,
                technicalConfidence
            });

            if (predictions) {
                mlPrediction = predictions.mlPrediction;
                detectedPatterns = predictions.detectedPatterns;
                nextCandlePrediction = predictions.nextCandlePrediction;
                predictionConsensus = predictions.predictionConsensus;
            }

            // Multi-timeframe analysis
            timeframeAlignment = await MultiTimeframeAnalyzer.analyzeTimeframes(
                pair,
                marketType,
                prices
            );

            // Optional: Boost confidence if predictions align strongly
            if (predictionConsensus && predictionConsensus.agreement >= 80) {
                // High agreement between all sources - boost confidence slightly
                const alignmentBonus = (predictionConsensus.agreement - 80) * 0.1; // Max 2% boost
                // Only boost if consensus matches our signal direction
                if (
                    (predictionConsensus.overallDirection === 'BULLISH' && technicalBias === 'BULLISH') ||
                    (predictionConsensus.overallDirection === 'BEARISH' && technicalBias === 'BEARISH')
                ) {
                    // Note: finalConfidence already calculated, this is informational
                    console.log(`✅ Prediction consensus confirms ${technicalBias} signal (${predictionConsensus.agreement}% agreement)`);
                }
            }

            // Log predictions for monitoring
            if (mlPrediction && mlPrediction.confidence > 60) {
                console.log(`🤖 ML Prediction: ${mlPrediction.direction} (${mlPrediction.confidence}% confidence)`);
            }
            if (detectedPatterns && detectedPatterns.length > 0) {
                console.log(`📐 Detected Patterns: ${detectedPatterns.map(p => p.name).join(', ')}`);
            }

        } catch (error) {
            console.error('Prediction engine error:', error);
            // Continue without predictions if there's an error
        }

        // Calculate entry, stop loss, and take profit with improved logic
        const entryPrice = currentPrice;
        let stopLoss: number;
        let takeProfit: number;

        // Calculate ATR for volatility-based targets
        const atr = this.calculateATR(prices);

        // Adjust multipliers based on confidence and sentiment
        // Higher confidence = wider TP, tighter SL
        // Bullish sentiment for BUY or Bearish for SELL = wider TP
        const confidenceMultiplier = confidence / 100;
        const sentimentAdjustment = Math.abs(sentimentScore.overall) / 100;

        if (direction === SignalDirection.BUY || direction === SignalDirection.LONG) {
            // For buy signals
            // Stop loss: tighter for high confidence
            const slMultiplier = 1.5 - (confidenceMultiplier * 0.3);
            stopLoss = entryPrice - (atr * slMultiplier);

            // Take profit: INCREASED slightly for better targets
            let tpMultiplier = 4.0 + (confidenceMultiplier * 3.0); // Was 3.5 + 2.5, now 4.0 + 3.0
            if (sentimentScore.overall > 30) {
                // Bullish news supports higher TP
                tpMultiplier += sentimentAdjustment * 2; // Was 1.5, now 2
            }
            takeProfit = entryPrice + (atr * tpMultiplier);

            // Adjust based on Bollinger Bands
            if (stopLoss > bollingerBands.lower) {
                stopLoss = bollingerBands.lower * 0.995;
            }
            // Set TP near upper band if very bullish
            if (sentimentScore.overall > 50 && takeProfit < bollingerBands.upper) {
                takeProfit = bollingerBands.upper * 0.98;
            }
        } else {
            // For sell signals
            // Stop loss: tighter for high confidence
            const slMultiplier = 1.5 - (confidenceMultiplier * 0.3);
            stopLoss = entryPrice + (atr * slMultiplier);

            // Take profit: INCREASED slightly for better targets
            let tpMultiplier = 4.0 + (confidenceMultiplier * 3.0); // Was 3.5 + 2.5, now 4.0 + 3.0
            if (sentimentScore.overall < -30) {
                // Bearish news supports lower TP
                tpMultiplier += sentimentAdjustment * 2; // Was 1.5, now 2
            }
            takeProfit = entryPrice - (atr * tpMultiplier);

            // Adjust based on Bollinger Bands
            if (stopLoss < bollingerBands.upper) {
                stopLoss = bollingerBands.upper * 1.005;
            }
            // Set TP near lower band if very bearish
            if (sentimentScore.overall < -50 && takeProfit > bollingerBands.lower) {
                takeProfit = bollingerBands.lower * 1.02;
            }
        }


        // Calculate Partial Take Profits (TP1, TP2, TP3)
        let takeProfit1: number;
        let takeProfit2: number;
        let takeProfit3: number;

        if (direction === SignalDirection.BUY || direction === SignalDirection.LONG) {
            // For LONG/BUY: TP1 at 25%, TP2 at 65%, TP3 at 85% of the move (OPTIMIZED)
            let tpDistance = takeProfit - entryPrice;

            // Ensure minimum distance (at least 0.5% of entry price)
            const minDistance = entryPrice * 0.005; // 0.5% minimum
            if (tpDistance < minDistance) {
                tpDistance = minDistance;
                takeProfit = entryPrice + tpDistance; // Adjust main TP as well
            }

            takeProfit1 = entryPrice + (tpDistance * 0.25); // 25% of move (realistic first target)
            takeProfit2 = entryPrice + (tpDistance * 0.65); // 65% of move (solid profit)
            takeProfit3 = entryPrice + (tpDistance * 0.85); // 85% (achievable final target)
        } else {
            // For SHORT/SELL: TP1 at 25%, TP2 at 65%, TP3 at 85% of the move (OPTIMIZED)
            let tpDistance = entryPrice - takeProfit;

            // Ensure minimum distance (at least 0.5% of entry price)
            const minDistance = entryPrice * 0.005; // 0.5% minimum
            if (tpDistance < minDistance) {
                tpDistance = minDistance;
                takeProfit = entryPrice - tpDistance; // Adjust main TP as well
            }

            takeProfit1 = entryPrice - (tpDistance * 0.25); // 25% of move (realistic first target)
            takeProfit2 = entryPrice - (tpDistance * 0.65); // 65% of move (solid profit)
            takeProfit3 = entryPrice - (tpDistance * 0.85); // 85% (achievable final target)

        }

        // Final validation: Ensure all prices are valid before creating signal
        const pricesToValidate = [entryPrice, stopLoss, takeProfit, takeProfit1, takeProfit2, takeProfit3];
        const hasInvalidPrice = pricesToValidate.some(p => !p || isNaN(p) || !isFinite(p) || p <= 0);

        if (hasInvalidPrice) {
            console.error(`⚠️ Skipping ${pair} - invalid TP/SL prices detected`);
            return null;
        }

        // Generate signal ID
        const id = `${pair.replace('/', '')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Set expiration (24 hours for spot, 48 hours for futures)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (signalType === SignalType.SPOT ? 24 : 48));

        // Get relevant news and economic events
        const newsEvents = await NewsAnalyzer.getNewsSummary(pair);
        const economicEvents = NewsAnalyzer.getEconomicSummary(pair);

        // Determine market condition
        const marketCondition = SignalHelpers.determineMarketCondition(
            newsImpactScore,
            currentVolume,
            volumeAvg,
            advancedAnalysis.trend
        );

        // Generate 3-bullet rationale
        const rationalePoints = SignalHelpers.generateRationale(
            newsImpact.catalyst,
            newsImpact.recentNews,
            rsi,
            macd,
            currentVolume,
            volumeAvg,
            direction,
            TechnicalAlignment.STRONG // Will be calculated properly in next update
        );

        // Calculate volume vs average
        const volumeVsAverage = Math.round((currentVolume / volumeAvg) * 100);

        // Set validUntil based on market condition
        const validUntil = new Date();
        const validityHours = marketCondition === MarketCondition.NEWS_DRIVEN ? 2 :
            marketCondition === MarketCondition.HIGH_VOLATILITY ? 4 : 12;
        validUntil.setHours(validUntil.getHours() + validityHours);

        // Determine which exchanges support this pair
        const availableExchanges = ExchangeAvailability.getAvailableExchanges(pair, marketType);

        const signal: Signal = {
            id,
            marketType,
            signalType,
            direction,
            status: SignalStatus.ACTIVE,
            pair,
            entryPrice,
            currentPrice,
            availableExchanges, // Include exchange availability
            stopLoss,
            takeProfit,
            takeProfit1,
            takeProfit2,
            takeProfit3,
            tp1Hit: false,
            tp2Hit: false,
            tp3Hit: false,
            confidence,
            timestamp: new Date(),
            expiresAt,
            profitLoss: 0,
            profitLossPercentage: 0,
            highestPrice: currentPrice,
            lowestPrice: currentPrice,
            newsEvents: newsEvents.length > 0 ? newsEvents : undefined,
            economicEvents: economicEvents.length > 0 ? economicEvents : undefined,
            sentimentScore: Math.round(sentimentScore.overall),
            // Advanced market analysis
            marketTrend: advancedAnalysis.trend,
            riskScore: advancedAnalysis.riskScore,
            marketAnalysis: advancedAnalysis.reasoning,
            liquidityZones: advancedAnalysis.keyLevels.liquidityZones,
            isCounterTrend, // Flag counter-trend signals
            // Timeframe information
            timeframe,
            nextCandleTime: this.calculateNextCandleTime(timeframe),
            // Enhanced news integration
            marketCondition,
            newsImpactScore,
            technicalAlignment: TechnicalAlignment.STRONG, // Placeholder - will be properly calculated
            validUntil,
            rationalePoints,
            volumeVsAverage,
            // Technical indicator values for display
            rsi,
            macdValue: macd.macd,
            macdSignal: macd.signal,

            // SPOT Signal Enhancements (only for SPOT signals)
            ...(signalType === SignalType.SPOT ? {
                riskLevel: this.SPOT_PROFILE.riskLevel,
                portfolioAllocation: calculatePortfolioAllocation(confidence),
                holdTimeRecommendation: calculateHoldTime(entryPrice, takeProfit3),
                volumeQuality: calculateVolumeQuality(currentVolume, volumeAvg).score,
                volumeQualityLabel: calculateVolumeQuality(currentVolume, volumeAvg).label,
                coinStability: getCoinStability(pair).score,
                coinStabilityLabel: getCoinStability(pair).label,
                beginnerTip: generateBeginnerTip(
                    direction === SignalDirection.BUY ? 'BUY' : 'SELL',
                    rsi,
                    sentimentScore.overall
                )
            } : {}),

            // Predictive AI Fields
            mlPrediction,
            detectedPatterns,
            timeframeAlignment,
            nextCandlePrediction,
            predictionConsensus,

            // Macro Economic Data Bias
            macroDataBias: macroBias
        };

        // Add macro rationale to signal rationale points
        if (macroBias && macroBias.rationale.length > 0 && signal.rationalePoints) {
            // Prepend macro context as first rationale point
            const macroSummary = `📊 Macro: ${macroBias.overallBias.replace('_', ' ')} bias — ${macroBias.rationale[0]}`;
            signal.rationalePoints = [macroSummary, ...signal.rationalePoints];
        }

        return signal;
    }

    /**
     * Calculate ATR (Average True Range) for stop loss/take profit
     * @param prices Array of prices
     * @param period Period for ATR calculation
     * @returns ATR value
     */
    private static calculateATR(prices: number[], period: number = 14): number {
        if (prices.length < period + 1) {
            return prices[prices.length - 1] * 0.02; // 2% fallback
        }

        const trueRanges: number[] = [];

        for (let i = 1; i < prices.length; i++) {
            const high = Math.max(prices[i], prices[i - 1]);
            const low = Math.min(prices[i], prices[i - 1]);
            const tr = high - low;
            trueRanges.push(tr);
        }

        const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
        return atr;
    }

    /**
     * Calculate Momentum (rate of price change)
     * @param prices Array of prices
     * @param period Period for momentum calculation
     * @returns Momentum value (-5 to +5 scale)
     */
    private static calculateMomentum(prices: number[], period: number = 10): number {
        if (prices.length < period + 1) return 0;

        const recentPrices = prices.slice(-period);
        let upMoves = 0;
        let downMoves = 0;
        let totalChange = 0;

        for (let i = 1; i < recentPrices.length; i++) {
            const change = recentPrices[i] - recentPrices[i - 1];
            totalChange += change;
            if (change > 0) upMoves++;
            else if (change < 0) downMoves++;
        }

        const avgChange = totalChange / period;
        const currentPrice = prices[prices.length - 1];
        const momentum = (avgChange / currentPrice) * 100; // Percentage

        // Scale to -5 to +5 range
        return Math.max(-5, Math.min(5, momentum * 50));
    }

    /**
     * Calculate current RSI from price array (for real-time updates)
     * @param prices Array of prices
     * @returns Current RSI value
     */
    static calculateCurrentRSI(prices: number[]): number | null {
        if (prices.length < 14) return null;
        return TechnicalIndicators.calculateRSI(prices);
    }

    /**
     * Calculate Rate of Change (ROC)
     * @param prices Array of prices
     * @param period Period for ROC calculation
     * @returns ROC percentage (-100 to +100)
     */
    private static calculateROC(prices: number[], period: number = 10): number {
        if (prices.length < period + 1) return 0;

        const currentPrice = prices[prices.length - 1];
        const oldPrice = prices[prices.length - period - 1];

        return ((currentPrice - oldPrice) / oldPrice) * 100;
    }

    /**
     * Update signal with current price and P/L
     * @param signal Signal to update
     * @param currentPrice Current market price
     * @returns Updated signal
     */
    static updateSignal(signal: Signal, currentPrice: number): Signal {
        // Track highest and lowest prices reached
        const highestPrice = Math.max(signal.highestPrice || signal.entryPrice, currentPrice);
        const lowestPrice = Math.min(signal.lowestPrice || signal.entryPrice, currentPrice);

        const profitLoss = (signal.direction === SignalDirection.BUY || signal.direction === SignalDirection.LONG)
            ? currentPrice - signal.entryPrice
            : signal.entryPrice - currentPrice;

        const profitLossPercentage = (profitLoss / signal.entryPrice) * 100;

        // Check partial TP hits
        let tp1Hit = signal.tp1Hit || false;
        let tp2Hit = signal.tp2Hit || false;
        let tp3Hit = signal.tp3Hit || false;

        // Check if stop loss or take profit hit
        let status = signal.status;

        // Only update status if signal is still ACTIVE
        if (status === SignalStatus.ACTIVE) {
            if (signal.direction === SignalDirection.BUY || signal.direction === SignalDirection.LONG) {
                // For LONG/BUY: Check partial TPs
                if (signal.takeProfit1 && highestPrice >= signal.takeProfit1) {
                    if (!tp1Hit) {
                        tp1Hit = true;
                        signal.tp1HitTime = new Date(); // Record TP1 hit time
                    }
                }
                if (signal.takeProfit2 && highestPrice >= signal.takeProfit2) {
                    if (!tp2Hit) {
                        tp2Hit = true;
                        signal.tp2HitTime = new Date(); // Record TP2 hit time
                    }
                }
                if (signal.takeProfit3 && highestPrice >= signal.takeProfit3) {
                    if (!tp3Hit) {
                        tp3Hit = true;
                        signal.tp3HitTime = new Date(); // Record TP3 hit time
                    }
                }

                // Check SL and TP
                if (lowestPrice <= signal.stopLoss) {
                    status = SignalStatus.STOPPED;
                } else if (tp2Hit || tp3Hit) {
                    // Complete signal when TP2 (65%) OR TP3 (85%) is hit
                    // This provides realistic completion rates
                    status = SignalStatus.COMPLETED;
                }
            } else {
                // For SHORT/SELL: Check partial TPs
                if (signal.takeProfit1 && lowestPrice <= signal.takeProfit1) {
                    if (!tp1Hit) {
                        tp1Hit = true;
                        signal.tp1HitTime = new Date(); // Record TP1 hit time
                    }
                }
                if (signal.takeProfit2 && lowestPrice <= signal.takeProfit2) {
                    if (!tp2Hit) {
                        tp2Hit = true;
                        signal.tp2HitTime = new Date(); // Record TP2 hit time
                    }
                }
                if (signal.takeProfit3 && lowestPrice <= signal.takeProfit3) {
                    if (!tp3Hit) {
                        tp3Hit = true;
                        signal.tp3HitTime = new Date(); // Record TP3 hit time
                    }
                }

                // Check SL and TP
                if (highestPrice >= signal.stopLoss) {
                    status = SignalStatus.STOPPED;
                } else if (tp2Hit || tp3Hit) {
                    // Complete signal when TP2 (65%) OR TP3 (85%) is hit
                    // This provides realistic completion rates
                    status = SignalStatus.COMPLETED;
                }
            }

            // Check expiration
            if (signal.expiresAt && new Date() > signal.expiresAt) {
                status = SignalStatus.COMPLETED;
            }
        }

        return {
            ...signal,
            currentPrice,
            highestPrice,
            lowestPrice,
            tp1Hit,
            tp2Hit,
            tp3Hit,
            profitLoss,
            profitLossPercentage,
            status
            // currentRsi is preserved from signal (updated externally by price monitoring)
        };
    }

    /**
     * Generate multiple signals for different pairs
     * Enhanced with parallel processing for faster loading
     * @param pairs Array of pairs to analyze
     * @param signalType Type of signals to generate
     * @param timeframe Candlestick timeframe for the signals
     * @returns Array of generated signals
     */
    static async generateMultipleSignals(
        marketDataList: MarketData[],
        signalType: SignalType,
        timeframe: Timeframe = Timeframe.ONE_HOUR
    ): Promise<Signal[]> {
        // Use Promise.allSettled for parallel processing
        // This allows all signals to generate simultaneously instead of one-by-one
        const results = await Promise.allSettled(
            marketDataList.map(marketData =>
                this.generateSignal(marketData, signalType, timeframe)
            )
        );

        // Filter successful results and extract signals
        const signals: Signal[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                signals.push(result.value);
            } else if (result.status === 'rejected') {
                // Log errors but don't block other signals
                console.error('Signal generation failed for pair:', result.reason);
            }
        }

        return signals;
    }

    /**
     * Calculate signal accuracy metrics
     * @param signals Array of signals
     * @returns Accuracy metrics
     */
    static calculateAccuracy(signals: Signal[]): {
        totalSignals: number;
        successfulSignals: number;
        failedSignals: number;
        activeSignals: number;
        accuracyRate: number;
        averageProfit: number;
    } {
        const totalSignals = signals.length;
        const activeSignals = signals.filter(s => s.status === SignalStatus.ACTIVE).length;
        const completedSignals = signals.filter(s => s.status === SignalStatus.COMPLETED);
        const stoppedSignals = signals.filter(s => s.status === SignalStatus.STOPPED);

        const successfulSignals = completedSignals.filter(s =>
            (s.profitLossPercentage || 0) > 0
        ).length;

        const failedSignals = stoppedSignals.length + completedSignals.filter(s =>
            (s.profitLossPercentage || 0) <= 0
        ).length;

        const closedSignals = totalSignals - activeSignals;
        const accuracyRate = closedSignals > 0
            ? (successfulSignals / closedSignals) * 100
            : 0;

        const totalProfit = signals.reduce((sum, s) => sum + (s.profitLossPercentage || 0), 0);
        const averageProfit = totalSignals > 0 ? totalProfit / totalSignals : 0;

        return {
            totalSignals,
            successfulSignals,
            failedSignals,
            activeSignals,
            accuracyRate,
            averageProfit
        };
    }

    /**
     * Check if signal direction contradicts market trend
     * @param direction Signal direction
     * @param trend Market trend
     * @returns True if counter-trend signal
     */
    private static isCounterTrendSignal(direction: SignalDirection, trend: string): boolean {
        const isBullishSignal = direction === SignalDirection.BUY || direction === SignalDirection.LONG;
        const isBearishSignal = direction === SignalDirection.SELL || direction === SignalDirection.SHORT;

        const isBearishMarket = trend === 'BEARISH' || trend === 'STRONG_BEARISH';
        const isBullishMarket = trend === 'BULLISH' || trend === 'STRONG_BULLISH';

        // Counter-trend: LONG in bearish market OR SHORT in bullish market
        return (isBullishSignal && isBearishMarket) || (isBearishSignal && isBullishMarket);
    }

    /**
     * Calculate when the next candle will close based on timeframe
     * @param timeframe Selected timeframe
     * @returns Date when next candle closes
     */
    private static calculateNextCandleTime(timeframe: Timeframe): Date {
        const now = new Date();
        const nextCandle = new Date(now);

        switch (timeframe) {
            case Timeframe.ONE_MINUTE:
                nextCandle.setMinutes(now.getMinutes() + 1, 0, 0);
                break;
            case Timeframe.FIVE_MINUTES:
                const nextFive = Math.ceil(now.getMinutes() / 5) * 5;
                nextCandle.setMinutes(nextFive, 0, 0);
                break;
            case Timeframe.FIFTEEN_MINUTES:
                const nextFifteen = Math.ceil(now.getMinutes() / 15) * 15;
                nextCandle.setMinutes(nextFifteen, 0, 0);
                break;
            case Timeframe.ONE_HOUR:
                nextCandle.setHours(now.getHours() + 1, 0, 0, 0);
                break;
            case Timeframe.FOUR_HOURS:
                const nextFourHour = Math.ceil(now.getHours() / 4) * 4;
                nextCandle.setHours(nextFourHour, 0, 0, 0);
                break;
            case Timeframe.ONE_DAY:
                nextCandle.setDate(now.getDate() + 1);
                nextCandle.setHours(0, 0, 0, 0);
                break;
        }

        return nextCandle;
    }
}
