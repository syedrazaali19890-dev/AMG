// Macro Economic Analyzer
// Analyzes Fed Rate, CPI, NFP, FOMC data and produces a macro signal bias
// This bias is used to influence signal generation decisions

import {
  MacroEvent,
  MacroEventType,
  MacroSignalBias,
  MarketType
} from './types';
import { MacroEconomicAPI } from './macroEconomicAPI';

export class MacroAnalyzer {
  // Cache for the computed bias (2 minute cache)
  private static biasCache: { data: MacroSignalBias; timestamp: number } | null = null;
  private static readonly BIAS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // ============================================
  // MAIN: Get Macro Signal Bias
  // ============================================

  /**
   * Get the overall macro-economic bias for signal generation
   * This is called before generating each signal
   */
  static async getMacroBias(): Promise<MacroSignalBias> {
    // Return cached bias if fresh
    if (this.biasCache && Date.now() - this.biasCache.timestamp < this.BIAS_CACHE_DURATION) {
      return this.biasCache.data;
    }

    const events = await MacroEconomicAPI.getAllMacroEvents();
    const bias = this.analyzeMacroEvents(events);

    this.biasCache = { data: bias, timestamp: Date.now() };
    console.log(`📊 Macro Bias: ${bias.overallBias} | Crypto: ${bias.cryptoBias} | USD: ${bias.forexUsdBias} | Confidence Mod: ${bias.confidenceModifier > 0 ? '+' : ''}${bias.confidenceModifier}`);

    return bias;
  }

  // ============================================
  // ANALYSIS ENGINE
  // ============================================

  private static analyzeMacroEvents(events: MacroEvent[]): MacroSignalBias {
    let hawkishScore = 0;  // Positive = hawkish = bearish for crypto, bullish for USD
    let dovishScore = 0;   // Positive = dovish = bullish for crypto, bearish for USD
    let volatilityScore = 0;
    let shouldGenerateSignals = true;
    const rationale: string[] = [];

    for (const event of events) {
      switch (event.type) {
        case MacroEventType.FED_RATE_HIKE:
          hawkishScore += this.analyzeFedRateHike(event, rationale);
          volatilityScore += 2;
          break;

        case MacroEventType.FED_RATE_CUT:
          dovishScore += this.analyzeFedRateCut(event, rationale);
          volatilityScore += 2;
          break;

        case MacroEventType.FED_RATE_HOLD:
          this.analyzeFedRateHold(event, rationale);
          volatilityScore += 1;
          break;

        case MacroEventType.CPI_RELEASE:
          const cpiResult = this.analyzeCPI(event, rationale);
          if (cpiResult > 0) hawkishScore += cpiResult;
          else dovishScore += Math.abs(cpiResult);
          volatilityScore += Math.abs(cpiResult) > 2 ? 2 : 1;
          break;

        case MacroEventType.NFP_RELEASE:
          const nfpResult = this.analyzeNFP(event, rationale);
          if (nfpResult > 0) hawkishScore += nfpResult;
          else dovishScore += Math.abs(nfpResult);
          volatilityScore += Math.abs(nfpResult) > 2 ? 2 : 1;
          break;

        case MacroEventType.FOMC_MEETING:
          const fomcResult = this.analyzeFOMC(event, rationale);
          volatilityScore += fomcResult;
          if (event.description.includes('TODAY')) {
            shouldGenerateSignals = false;
          }
          break;
      }
    }

    // Calculate net bias
    const netScore = dovishScore - hawkishScore; // Positive = dovish/bullish for risk

    // Determine overall bias
    const overallBias = this.scoreToBias(netScore);

    // Crypto: Dovish = Bullish, Hawkish = Bearish
    const cryptoBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      netScore > 2 ? 'BULLISH' : netScore < -2 ? 'BEARISH' : 'NEUTRAL';

    // USD: Hawkish = Bullish, Dovish = Bearish (inverse of crypto)
    const forexUsdBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      netScore < -2 ? 'BULLISH' : netScore > 2 ? 'BEARISH' : 'NEUTRAL';

    // Confidence modifier: max ±20
    const confidenceModifier = Math.max(-20, Math.min(20, Math.round(netScore * 2.5)));

    // Volatility level
    const volatilityExpected = volatilityScore >= 6 ? 'EXTREME'
      : volatilityScore >= 4 ? 'HIGH'
      : volatilityScore >= 2 ? 'MODERATE'
      : 'LOW';

    // During extreme volatility, reduce signal generation
    if (volatilityExpected === 'EXTREME' && !shouldGenerateSignals) {
      rationale.push('⚠️ Signal generation paused due to FOMC meeting today');
    }

    return {
      overallBias,
      confidenceModifier,
      volatilityExpected,
      shouldGenerateSignals,
      rationale,
      events,
      cryptoBias,
      forexUsdBias,
      lastUpdated: new Date()
    };
  }

  // ============================================
  // INDIVIDUAL EVENT ANALYSIS
  // ============================================

  /**
   * Fed Rate Hike Analysis
   * Rate hike → Hawkish → Bearish for crypto, Bullish for USD
   */
  private static analyzeFedRateHike(event: MacroEvent, rationale: string[]): number {
    const bps = event.actualValue && event.previousValue
      ? Math.round((event.actualValue - event.previousValue) * 100)
      : 25;

    let score = 0;

    if (bps >= 50) {
      // Aggressive hike (50+ bps)
      score = 5;
      rationale.push(`🦅 FED AGGRESSIVE HIKE: +${bps}bps — Strongly hawkish, heavy bearish pressure on risk assets`);
    } else if (bps >= 25) {
      // Standard hike (25 bps)
      score = 3;
      rationale.push(`🦅 FED RATE HIKE: +${bps}bps to ${event.actualValue?.toFixed(2)}% — Hawkish, bearish for crypto/risk assets`);
    } else {
      score = 1;
      rationale.push(`🦅 FED MINOR HIKE: +${bps}bps — Mildly hawkish signal`);
    }

    return score;
  }

  /**
   * Fed Rate Cut Analysis
   * Rate cut → Dovish → Bullish for crypto, Bearish for USD
   */
  private static analyzeFedRateCut(event: MacroEvent, rationale: string[]): number {
    const bps = event.actualValue && event.previousValue
      ? Math.round((event.previousValue - event.actualValue) * 100)
      : 25;

    let score = 0;

    if (bps >= 50) {
      // Emergency/aggressive cut
      score = 5;
      rationale.push(`🕊️ FED AGGRESSIVE CUT: -${bps}bps — Strongly dovish, bullish for crypto/risk assets`);
    } else if (bps >= 25) {
      // Standard cut
      score = 3;
      rationale.push(`🕊️ FED RATE CUT: -${bps}bps to ${event.actualValue?.toFixed(2)}% — Dovish, bullish for crypto/risk assets`);
    } else {
      score = 1;
      rationale.push(`🕊️ FED MINOR CUT: -${bps}bps — Mildly dovish signal`);
    }

    return score;
  }

  /**
   * Fed Rate Hold Analysis
   */
  private static analyzeFedRateHold(event: MacroEvent, rationale: string[]): void {
    rationale.push(`⏸️ FED HOLD: Rate at ${event.actualValue?.toFixed(2)}% — No change, market data dependent`);
  }

  /**
   * CPI/Inflation Analysis
   * CPI above expected → Hawkish (positive return)
   * CPI below expected → Dovish (negative return)
   */
  private static analyzeCPI(event: MacroEvent, rationale: string[]): number {
    const actual = event.actualValue || 0;
    const expected = event.expectedValue || actual;
    const previous = event.previousValue || actual;
    const surprise = event.surprise;

    let score = 0;

    if (surprise === 'ABOVE') {
      // Hot inflation → Hawkish
      const diff = actual - expected;
      if (diff > 0.3) {
        score = 4;
        rationale.push(`🔥 HOT CPI: ${actual}% vs expected ${expected}% — Inflation running hot, rate hikes risk, BEARISH for risk`);
      } else {
        score = 2;
        rationale.push(`📈 CPI ABOVE: ${actual}% vs expected ${expected}% — Slightly hawkish, mild bearish pressure`);
      }
    } else if (surprise === 'BELOW') {
      // Cooling inflation → Dovish
      const diff = expected - actual;
      if (diff > 0.3) {
        score = -4;
        rationale.push(`❄️ COOL CPI: ${actual}% vs expected ${expected}% — Inflation cooling fast, rate cuts likely, BULLISH for risk`);
      } else {
        score = -2;
        rationale.push(`📉 CPI BELOW: ${actual}% vs expected ${expected}% — Slightly dovish, mild bullish support`);
      }
    } else {
      // Inline
      score = 0;
      rationale.push(`➡️ CPI INLINE: ${actual}% as expected — No surprise, neutral impact`);
    }

    // Additional context: trend direction
    if (actual < previous) {
      rationale.push(`📊 CPI Trend: Declining (${previous}% → ${actual}%) — Disinflation trend supports risk assets`);
      score -= 1; // Trending down is slightly dovish
    } else if (actual > previous) {
      rationale.push(`📊 CPI Trend: Rising (${previous}% → ${actual}%) — Reflation concern`);
      score += 1; // Trending up is slightly hawkish
    }

    return score;
  }

  /**
   * NFP/Jobs Data Analysis
   * Strong jobs (above expected) → Hawkish (economy strong, Fed may hike)
   * Weak jobs (below expected) → Dovish (economy weak, Fed may cut)
   */
  private static analyzeNFP(event: MacroEvent, rationale: string[]): number {
    const actual = event.actualValue || 0;
    const expected = event.expectedValue || actual;
    const surprise = event.surprise;

    let score = 0;

    if (surprise === 'ABOVE') {
      // Strong jobs → Economy strong but hawkish
      const diff = actual - expected;
      if (diff > 60) {
        score = 3;
        rationale.push(`💪 STRONG NFP: ${actual}K vs expected ${expected}K (+${diff}K) — Very strong labor market, hawkish Fed risk`);
      } else {
        score = 1;
        rationale.push(`📈 NFP ABOVE: ${actual}K vs expected ${expected}K — Solid jobs, mildly hawkish`);
      }
    } else if (surprise === 'BELOW') {
      // Weak jobs → Dovish
      const diff = expected - actual;
      if (diff > 60) {
        score = -3;
        rationale.push(`😰 WEAK NFP: ${actual}K vs expected ${expected}K (-${diff}K) — Labor market weakening, Fed cut expectations rise, BULLISH for risk`);
      } else {
        score = -1;
        rationale.push(`📉 NFP BELOW: ${actual}K vs expected ${expected}K — Soft jobs data, mildly dovish`);
      }
    } else {
      score = 0;
      rationale.push(`➡️ NFP INLINE: ${actual}K as expected ${expected}K — No surprise, neutral impact`);
    }

    return score;
  }

  /**
   * FOMC Meeting Proximity Analysis
   * Returns volatility score (higher = more volatile expected)
   */
  private static analyzeFOMC(event: MacroEvent, rationale: string[]): number {
    const daysUntil = event.date
      ? Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysUntil <= 0) {
      rationale.push(`⚡ FOMC MEETING TODAY — Extreme volatility expected, signals paused`);
      return 5;
    } else if (daysUntil <= 2) {
      rationale.push(`⚠️ FOMC in ${daysUntil} days — High uncertainty, reduced signal confidence`);
      return 3;
    } else if (daysUntil <= 5) {
      rationale.push(`📅 FOMC in ${daysUntil} days — Moderate pre-FOMC positioning uncertainty`);
      return 2;
    } else {
      rationale.push(`📅 Next FOMC in ${daysUntil} days — Low macro impact currently`);
      return 1;
    }
  }

  // ============================================
  // HELPER: Apply Bias to Market Type
  // ============================================

  /**
   * Get confidence modifier adjusted for specific market type
   * Crypto and Forex react differently to macro events
   */
  static getMarketSpecificModifier(bias: MacroSignalBias, marketType: MarketType): number {
    if (marketType === MarketType.CRYPTO) {
      // Crypto follows dovish=bullish, hawkish=bearish
      return bias.confidenceModifier;
    } else {
      // Forex (USD pairs): inverse relationship
      // Hawkish = bullish USD = bearish EUR/USD, GBP/USD
      // Dovish = bearish USD = bullish EUR/USD, GBP/USD
      return -bias.confidenceModifier;
    }
  }

  /**
   * Check if signal direction aligns with macro bias
   * Returns true if aligned (boost confidence) or false if conflicting (reduce confidence)
   */
  static isDirectionAligned(
    bias: MacroSignalBias,
    direction: 'BUY' | 'SELL' | 'LONG' | 'SHORT',
    marketType: MarketType
  ): boolean {
    const isBullishSignal = direction === 'BUY' || direction === 'LONG';
    const relevantBias = marketType === MarketType.CRYPTO ? bias.cryptoBias : bias.forexUsdBias;

    if (isBullishSignal && relevantBias === 'BULLISH') return true;
    if (!isBullishSignal && relevantBias === 'BEARISH') return true;
    if (relevantBias === 'NEUTRAL') return true; // Neutral doesn't conflict

    return false;
  }

  // ============================================
  // UTILITY
  // ============================================

  private static scoreToBias(netScore: number): MacroSignalBias['overallBias'] {
    if (netScore >= 5) return 'STRONG_BULLISH';
    if (netScore >= 2) return 'BULLISH';
    if (netScore <= -5) return 'STRONG_BEARISH';
    if (netScore <= -2) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Clear cache to force re-analysis
   */
  static clearCache(): void {
    this.biasCache = null;
    MacroEconomicAPI.clearCache();
  }
}
