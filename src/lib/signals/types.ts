// Signal Types and Interfaces

export enum MarketType {
  FOREX = 'FOREX',
  CRYPTO = 'CRYPTO'
}

export enum SignalType {
  SPOT = 'SPOT',
  FUTURE = 'FUTURE'
}

export enum SignalDirection {
  BUY = 'BUY',
  SELL = 'SELL',
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum SignalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED'
}

export enum Timeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1D'
}

// New enums for enhanced news integration
export enum MarketCondition {
  HIGH_VOLATILITY = 'HIGH_VOLATILITY',
  NEWS_DRIVEN = 'NEWS_DRIVEN',
  TRENDING = 'TRENDING',
  RANGING = 'RANGING'
}

export enum TechnicalAlignment {
  STRONG = 'STRONG',
  MODERATE = 'MODERATE',
  WEAK = 'WEAK'
}

// ============================================
// PREDICTIVE AI TYPE DEFINITIONS
// ============================================

// ML Prediction Interface
export interface MLPrediction {
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  confidence: number; // 0-100
  targetPrice: number;
  expectedHigh: number;
  expectedLow: number;
  predictionHorizon: Timeframe;
  modelVersion: string;
  modelAccuracy?: number; // Historical accuracy of this model
}

// Candlestick Pattern Types
export enum PatternType {
  // Bullish Patterns
  BULLISH_ENGULFING = 'BULLISH_ENGULFING',
  HAMMER = 'HAMMER',
  MORNING_STAR = 'MORNING_STAR',
  THREE_WHITE_SOLDIERS = 'THREE_WHITE_SOLDIERS',
  PIERCING_LINE = 'PIERCING_LINE',
  BULLISH_HARAMI = 'BULLISH_HARAMI',

  // Bearish Patterns
  BEARISH_ENGULFING = 'BEARISH_ENGULFING',
  SHOOTING_STAR = 'SHOOTING_STAR',
  EVENING_STAR = 'EVENING_STAR',
  THREE_BLACK_CROWS = 'THREE_BLACK_CROWS',
  DARK_CLOUD_COVER = 'DARK_CLOUD_COVER',
  BEARISH_HARAMI = 'BEARISH_HARAMI',

  // Neutral/Reversal Patterns
  DOJI = 'DOJI',
  SPINNING_TOP = 'SPINNING_TOP',
  TWEEZER_TOP = 'TWEEZER_TOP',
  TWEEZER_BOTTOM = 'TWEEZER_BOTTOM'
}

export interface CandlestickPattern {
  name: string;
  type: PatternType;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100 (how strong/clear the pattern is)
  reliability: number; // Historical success rate 0-100
  formationProgress: number; // 0-100 (for patterns still forming)
  isComplete: boolean;
  detectedAt: Date;
  expectedOutcome: 'REVERSAL' | 'CONTINUATION';
  priceTarget?: number;
}

// Order Book Data (for Crypto)
export interface PriceLevel {
  price: number;
  volume: number;
  totalVolume: number; // Cumulative volume at this level
  significance: number; // 0-100 (how significant this level is)
  isWall: boolean; // Large order cluster
}

export interface OrderBookDepth {
  buyPressure: number; // 0-100
  sellPressure: number; // 0-100
  bidAskRatio: number;
  spread: number;
  spreadPercentage: number;
  buyWalls: PriceLevel[];
  sellWalls: PriceLevel[];
  imbalance: 'BUY' | 'SELL' | 'NEUTRAL';
  liquidity: 'HIGH' | 'MEDIUM' | 'LOW';
  lastUpdated: Date;
}

// Multi-Timeframe Analysis
export interface TimeframeData {
  timeframe: Timeframe;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number; // 0-100
  rsi: number;
  macdSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface TimeframeAlignment {
  aligned: boolean;
  alignedTimeframes: Timeframe[];
  conflictingTimeframes: Timeframe[];
  strength: number; // 0-100 (how strongly timeframes agree)
  dominantTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  divergences: string[]; // Descriptions of conflicts
  timeframeData: TimeframeData[];
}

// Volume Profile Data
export interface VolumeNode {
  price: number;
  volume: number;
  type: 'HIGH_VOLUME' | 'LOW_VOLUME' | 'POC'; // Point of Control
}

export interface VolumeProfileData {
  valueAreaHigh: number; // VAH - Top of value area
  valueAreaLow: number; // VAL - Bottom of value area
  pointOfControl: number; // POC - Highest volume price
  highVolumeNodes: VolumeNode[]; // Support/Resistance zones
  lowVolumeNodes: VolumeNode[]; // Potential breakout zones
  volumeDistribution: 'NORMAL' | 'BIMODAL' | 'SKEWED';
}

// Next Candle Prediction
export interface NextCandlePrediction {
  bullishProbability: number; // 0-100
  bearishProbability: number; // 0-100
  neutralProbability: number; // 0-100
  expectedHigh: number;
  expectedLow: number;
  expectedClose: number;
  volatilityExpansion: boolean;
  breakoutLikely: boolean;
  breakoutDirection?: 'UP' | 'DOWN';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  predictionSources: string[]; // What contributed to this prediction
}

// Prediction Consensus (combines all prediction sources)
export interface PredictionConsensus {
  overallDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number; // 0-100
  mlWeight: number; // How much ML contributed
  patternWeight: number; // How much patterns contributed
  technicalWeight: number; // How much technicals contributed
  orderBookWeight: number; // How much order book contributed
  agreement: number; // 0-100 (how much sources agree)
  conflictingSignals: string[];
}

export interface Signal {
  id: string;
  marketType: MarketType;
  signalType: SignalType;
  direction: SignalDirection;
  status: SignalStatus;
  pair: string;
  entryPrice: number;
  // Entry Zone - recommended price range for entry (prevents late entry problem)
  entryZoneHigh?: number;   // Upper bound of entry zone (market price at signal time)
  entryZoneLow?: number;    // Lower bound of entry zone (pullback target)
  suggestedLimitEntry?: number; // Suggested limit order price for optimal entry
  currentPrice: number;
  mexcPrice?: number; // Optional price from MEXC for comparison
  availableExchanges?: string[]; // List of exchanges where this pair is available
  stopLoss: number;
  takeProfit: number;
  // Partial Take Profits
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  tp1Hit?: boolean;
  tp2Hit?: boolean;
  tp3Hit?: boolean;
  // Track when each TP was hit
  tp1HitTime?: Date;
  tp2HitTime?: Date;
  tp3HitTime?: Date;
  confidence: number;
  timestamp: Date;
  expiresAt?: Date;
  profitLoss?: number;
  profitLossPercentage?: number;
  // Track highest/lowest prices to detect TP hits
  highestPrice?: number;
  lowestPrice?: number;
  // News and sentiment data
  newsEvents?: string[];
  economicEvents?: string[];
  sentimentScore?: number;
  // Advanced market analysis
  marketTrend?: string;
  riskScore?: number;
  marketAnalysis?: string[];
  liquidityZones?: { price: number; type: string; strength: number }[];
  isCounterTrend?: boolean; // True if trading against market trend
  // Timeframe information
  timeframe: Timeframe; // Candlestick timeframe for this signal
  nextCandleTime?: Date; // When the next candle closes
  // Enhanced news integration fields
  marketCondition?: MarketCondition; // Market condition classification
  newsImpactScore?: number; // Aggregate news score (-5 to +5)
  technicalAlignment?: TechnicalAlignment; // How well technicals align
  validUntil?: Date; // Signal validity timestamp
  rationalePoints?: string[]; // 3-bullet rationale (news + technicals + volume)
  volumeVsAverage?: number; // Current volume as % of average
  // Technical indicator values for display
  rsi?: number; // RSI value at entry (0-100)
  currentRsi?: number; // Current RSI value (updated in real-time)
  macdValue?: number; // MACD line value
  macdSignal?: number; // MACD signal line value

  // SPOT Signal Enhancements
  riskLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  portfolioAllocation?: string; // e.g., "5-8%"
  holdTimeRecommendation?: string; // e.g., "2-5 days"
  volumeQuality?: number; // 1-5 stars
  volumeQualityLabel?: string; // "Excellent", "Very Good", etc.
  coinStability?: number; // 1-5 stars
  coinStabilityLabel?: string; // "Most Stable", "Volatile", etc.
  beginnerTip?: string; // Educational tip for beginners

  // ============================================
  // PREDICTIVE AI FIELDS
  // ============================================

  // ML-based prediction
  mlPrediction?: MLPrediction;

  // Detected candlestick patterns
  detectedPatterns?: CandlestickPattern[];

  // Order book analysis (crypto only)
  orderBookDepth?: OrderBookDepth;

  // Multi-timeframe correlation
  timeframeAlignment?: TimeframeAlignment;

  // Volume profile analysis
  volumeProfile?: VolumeProfileData;

  // Next candle prediction
  nextCandlePrediction?: NextCandlePrediction;

  // Overall prediction consensus
  predictionConsensus?: PredictionConsensus;

  // Macro-economic data bias (Fed rates, CPI, NFP, FOMC)
  macroDataBias?: MacroSignalBias;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  ema: {
    ema9: number;
    ema21: number;
    ema50: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  volume: number;
  volumeAverage: number;
}

export interface MarketData {
  pair: string;
  marketType: MarketType;
  prices: number[];
  volumes: number[];
  timestamps: Date[];
  currentPrice: number;
}

// ============================================
// MACRO ECONOMIC DATA TYPES
// ============================================

export enum MacroEventType {
  FED_RATE_HIKE = 'FED_RATE_HIKE',
  FED_RATE_CUT = 'FED_RATE_CUT',
  FED_RATE_HOLD = 'FED_RATE_HOLD',
  FOMC_MEETING = 'FOMC_MEETING',
  CPI_RELEASE = 'CPI_RELEASE',
  NFP_RELEASE = 'NFP_RELEASE',
}

export interface MacroEvent {
  type: MacroEventType;
  name: string;
  date: Date;
  actualValue?: number;
  expectedValue?: number;
  previousValue?: number;
  surprise: 'ABOVE' | 'BELOW' | 'INLINE' | 'UNKNOWN';
  impact: 'HAWKISH' | 'DOVISH' | 'NEUTRAL';
  description: string;
}

export interface MacroSignalBias {
  overallBias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  confidenceModifier: number;      // -20 to +20
  volatilityExpected: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  shouldGenerateSignals: boolean;   // false during extreme events
  rationale: string[];              // Explanation bullets
  events: MacroEvent[];             // Individual event analyses
  cryptoBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  forexUsdBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  lastUpdated: Date;
}

export interface SignalAccuracy {
  totalSignals: number;
  successfulSignals: number;
  failedSignals: number;
  activeSignals: number;
  accuracyRate: number;
  averageProfit: number;
}
