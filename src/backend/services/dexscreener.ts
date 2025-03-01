import axios from "axios";
import { Token, DexscreenerToken, TokenPairData } from "../types/interfaces";

export class DexscreenerService {
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number;
  private readonly maxRetries: number;
  private readonly timeout: number;

  // Filtering thresholds from env
  private readonly MIN_LIQUIDITY_USD: number;
  private readonly MIN_VOLUME_24H: number;
  private readonly MIN_TXNS_24H: number;
  private readonly MIN_MARKET_CAP: number;
  private readonly MAX_MARKET_CAP: number;

  // Scoring weights from env
  private readonly SCORE_WEIGHTS: {
    liquidity: number;
    volume: number;
    transactions: number;
    priceChange: number;
    marketCap: number;
  };

  constructor() {
    // API configuration
    this.minRequestInterval = parseInt(
      process.env.DEXSCREENER_REQUEST_INTERVAL || "1000"
    );
    this.maxRetries = parseInt(process.env.DEXSCREENER_MAX_RETRIES || "3");
    this.timeout = parseInt(process.env.DEXSCREENER_TIMEOUT || "5000");

    // Filtering thresholds
    this.MIN_LIQUIDITY_USD = parseInt(process.env.MIN_LIQUIDITY_USD || "50000");
    this.MIN_VOLUME_24H = parseInt(process.env.MIN_VOLUME_24H || "10000");
    this.MIN_TXNS_24H = parseInt(process.env.MIN_TXNS_24H || "50");
    this.MIN_MARKET_CAP = parseInt(process.env.MIN_MARKET_CAP || "1000000");
    this.MAX_MARKET_CAP = parseInt(process.env.MAX_MARKET_CAP || "100000000");

    // Scoring weights
    this.SCORE_WEIGHTS = {
      liquidity: parseFloat(process.env.WEIGHT_LIQUIDITY || "0.25"),
      volume: parseFloat(process.env.WEIGHT_VOLUME || "0.25"),
      transactions: parseFloat(process.env.WEIGHT_TRANSACTIONS || "0.20"),
      priceChange: parseFloat(process.env.WEIGHT_PRICE_CHANGE || "0.15"),
      marketCap: parseFloat(process.env.WEIGHT_MARKET_CAP || "0.15"),
    };

    // Validate weights sum to 1
    const weightSum = Object.values(this.SCORE_WEIGHTS).reduce(
      (a, b) => a + b,
      0
    );
    if (Math.abs(weightSum - 1) > 0.001) {
      throw new Error(`Score weights must sum to 1. Current sum: ${weightSum}`);
    }
  }

  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  public async getLatestTokens(): Promise<DexscreenerToken[]> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        await this.rateLimit();

        const response = await axios.get(
          `https://api.dexscreener.com/token-profiles/latest/v1`,
          {
            timeout: this.timeout,
            validateStatus: (status) => status === 200,
          }
        );

        const tokens = response.data;

        return tokens;
      } catch (error) {
        retries++;
        if (this.handleError(error, retries)) continue;
        throw error;
      }
    }

    throw new Error("Failed to fetch latest tokens after maximum retries");
  }

  public async getBestToken(): Promise<Token> {
    let retries = 0;
    const validTokens: Token[] = [];

    while (retries < this.maxRetries) {
      try {
        await this.rateLimit();

        const response = await axios.get(
          `https://api.dexscreener.com/token-profiles/latest/v1`,
          {
            timeout: this.timeout,
            validateStatus: (status) => status === 200,
          }
        );

        // Collect all valid tokens first
        for (const token of response.data) {
          const pairData = await this.getTokenPairData(
            token.chainId,
            token.tokenAddress
          );

          if (this.isValidToken(pairData)) {
            validTokens.push(this.transformToken(token, pairData[0]));
          }
        }

        // Score and rank the valid tokens
        const rankedTokens = this.rankTokens(validTokens);

        // Return the highest scored token
        return rankedTokens[0];
      } catch (error) {
        retries++;
        if (this.handleError(error, retries)) continue;
        throw error;
      }
    }

    throw new Error("Failed to fetch tokens after maximum retries");
  }

  public async getTokenPairData(
    chainId: string,
    tokenAddress: string
  ): Promise<TokenPairData[]> {
    try {
      await this.rateLimit();
      const response = await axios.get(
        `https://api.dexscreener.com/token-pairs/v1/${chainId}/${tokenAddress}`,
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching pair data for ${tokenAddress}:`, error);
      return [];
    }
  }

  private isValidToken(pairs: TokenPairData[]): boolean {
    if (!pairs.length) return false;

    const mainPair = pairs[0]; // Use the first/main pair for analysis

    // Add market cap check
    const hasValidMarketCap = Boolean(
      mainPair.marketCap &&
        mainPair.marketCap >= this.MIN_MARKET_CAP &&
        mainPair.marketCap <= this.MAX_MARKET_CAP
    );

    return (
      (mainPair.liquidity?.usd || 0) >= this.MIN_LIQUIDITY_USD &&
      (mainPair.volume?.h24 || 0) >= this.MIN_VOLUME_24H &&
      (mainPair.txns?.h24?.buys || 0) + (mainPair.txns?.h24?.sells || 0) >=
        this.MIN_TXNS_24H &&
      hasValidMarketCap
    );
  }

  private transformToken(
    dexToken: DexscreenerToken,
    pairData: TokenPairData
  ): Token {
    return {
      url: dexToken.url,
      chainId: dexToken.chainId,
      tokenAddress: dexToken.tokenAddress,
      icon: dexToken.icon,
      header: dexToken.header,
      openGraph: dexToken.openGraph,
      description: dexToken.description,
      links: dexToken.links,
      totalAmount: dexToken.totalAmount,
      // Liquidity pool data
      price: parseFloat(pairData.priceUsd || "0"),
      volume24h: pairData.volume?.h24 || 0,
      liquidity: pairData.liquidity?.usd || 0,
      priceChange24h: pairData.priceChange?.h24 || 0,
      txCount24h:
        (pairData.txns?.h24?.buys || 0) + (pairData.txns?.h24?.sells || 0),
      marketCap: pairData.marketCap || 0, // Added market cap
    };
  }

  private handleError(error: any, retries: number): boolean {
    const isTimeout =
      axios.isAxiosError(error) &&
      (error.code === "ECONNABORTED" ||
        error.code === "UND_ERR_CONNECT_TIMEOUT");

    if (isTimeout) {
      console.warn(
        `Dexscreener request timeout (attempt ${retries}/${this.maxRetries})`
      );
      const backoffTime = Math.min(1000 * Math.pow(2, retries), 10000);
      setTimeout(() => {}, backoffTime);
      return retries < this.maxRetries;
    }

    return false;
  }

  private rankTokens(tokens: Token[]): Token[] {
    // Calculate min and max values for normalization
    const metrics = tokens.reduce(
      (acc, token) => {
        return {
          liquidity: {
            min: Math.min(acc.liquidity.min, token.liquidity),
            max: Math.max(acc.liquidity.max, token.liquidity),
          },
          volume: {
            min: Math.min(acc.volume.min, token.volume24h),
            max: Math.max(acc.volume.max, token.volume24h),
          },
          transactions: {
            min: Math.min(acc.transactions.min, token.txCount24h),
            max: Math.max(acc.transactions.max, token.txCount24h),
          },
          priceChange: {
            min: Math.min(acc.priceChange.min, token.priceChange24h),
            max: Math.max(acc.priceChange.max, token.priceChange24h),
          },
          marketCap: {
            min: Math.min(acc.marketCap.min, token.marketCap),
            max: Math.max(acc.marketCap.max, token.marketCap),
          },
        };
      },
      {
        liquidity: { min: Infinity, max: -Infinity },
        volume: { min: Infinity, max: -Infinity },
        transactions: { min: Infinity, max: -Infinity },
        priceChange: { min: Infinity, max: -Infinity },
        marketCap: { min: Infinity, max: -Infinity },
      }
    );

    // Score each token
    const scoredTokens = tokens.map((token) => {
      const score = this.calculateTokenScore(token, metrics);
      return { ...token, score };
    });

    // Sort by score in descending order
    return scoredTokens
      .sort((a, b) => (b as any).score - (a as any).score)
      .map(({ score, ...token }) => token); // Remove score before returning
  }

  private calculateTokenScore(token: Token, metrics: any): number {
    // Normalize each metric to a 0-1 scale and apply weights
    const liquidityScore =
      this.normalize(
        token.liquidity,
        metrics.liquidity.min,
        metrics.liquidity.max
      ) * this.SCORE_WEIGHTS.liquidity;
    const volumeScore =
      this.normalize(token.volume24h, metrics.volume.min, metrics.volume.max) *
      this.SCORE_WEIGHTS.volume;
    const txScore =
      this.normalize(
        token.txCount24h,
        metrics.transactions.min,
        metrics.transactions.max
      ) * this.SCORE_WEIGHTS.transactions;

    // For price change, we want to favor positive changes but not too extreme
    const priceChangeScore =
      this.calculatePriceChangeScore(token.priceChange24h) *
      this.SCORE_WEIGHTS.priceChange;

    // For market cap, we prefer lower values within our valid range
    const marketCapScore =
      (1 -
        this.normalize(
          token.marketCap,
          metrics.marketCap.min,
          metrics.marketCap.max
        )) *
      this.SCORE_WEIGHTS.marketCap;

    return (
      liquidityScore + volumeScore + txScore + priceChangeScore + marketCapScore
    );
  }

  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 1;
    return (value - min) / (max - min);
  }

  private calculatePriceChangeScore(priceChange: number): number {
    // Favor moderate positive price changes (10-30%)
    if (priceChange > 0 && priceChange <= 30) {
      return priceChange / 30;
    } else if (priceChange > 30) {
      return 1 - (priceChange - 30) / 70; // Decreasing score for changes above 30%
    } else {
      return Math.max(0, (priceChange + 20) / 20); // Some score for small negative changes
    }
  }
}
