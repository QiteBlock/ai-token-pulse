import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import axios from "axios";
import {
  GetTokenPairDataSchema,
  GetLatestTokensSchema,
  GetBestTokenSchema,
} from "./schemas";
import { Token } from "../../types/interfaces";

export class DexscreenerActionProvider extends ActionProvider {
  private lastRequestTime: number = 0;
  private readonly baseUrl: string = "https://api.dexscreener.com/latest/dex";
  private readonly minRequestInterval: number;
  private readonly timeout: number;

  constructor() {
    super("dexscreener", []);

    this.minRequestInterval = parseInt(
      process.env.DEXSCREENER_REQUEST_INTERVAL || "1000"
    );
    this.timeout = parseInt(process.env.DEXSCREENER_TIMEOUT || "5000");
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

  @CreateAction({
    name: "get_latest_tokens",
    description: `Fetches recently created tokens with their metadata. Parameters:
- limit: Maximum number of tokens to return (default: 10)
Returns: Formatted list of tokens with their details and social links.`,
    schema: GetLatestTokensSchema,
  })
  async getLatestTokens(
    args: z.infer<typeof GetLatestTokensSchema>
  ): Promise<string> {
    try {
      await this.rateLimit();

      const response = await axios.get(
        `https://api.dexscreener.com/token-profiles/latest/v1`,
        {
          timeout: this.timeout,
          validateStatus: (status) => status === 200,
        }
      );

      const tokens: Token[] = response.data.slice(0, args.limit);
      let formattedOutput = "";

      tokens.forEach((token: any, index: number) => {
        formattedOutput += `Token ${index + 1}:\n`;
        formattedOutput += `Token Address: ${token.tokenAddress}\n`;
        formattedOutput += `Chain: ${token.chainId}\n`;
        formattedOutput += `URL: ${token.url}\n`;

        if (token.links && Object.keys(token.links).length > 0) {
          formattedOutput += `Social Media:\n`;
          token.links.forEach(([type, url]) => {
            formattedOutput += `- Type: ${url.label}\n  URL: ${url.url}\n`;
          });
        }

        if (token.description) {
          formattedOutput += `Description: ${token.description}\n`;
        }

        formattedOutput += `\n\n`; // Add space between tokens
      });

      return formattedOutput;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return "Error fetching latest tokens: Rate limit exceeded";
      }
      return `Error fetching latest tokens: ${error}`;
    }
  }

  @CreateAction({
    name: "get_best_token",
    description: `Analyzes and finds the best token based on metrics. Parameters:
- minLiquidityUsd: Min liquidity (default: 50k)
- minVolume24h: Min volume (default: 10k)
- minTxns24h: Min transactions (default: 50)
Returns: Best token with analysis and scoring.`,
    schema: GetBestTokenSchema,
  })
  async getBestToken(
    args: z.infer<typeof GetBestTokenSchema>
  ): Promise<string> {
    try {
      await this.rateLimit();

      const response = await axios.get(
        `https://api.dexscreener.com/token-profiles/latest/v1`,
        {
          timeout: this.timeout,
        }
      );

      const analyzedTokens = response.data.pairs
        .filter((pair: any) => {
          return (
            pair &&
            pair.liquidity?.usd >= args.minLiquidityUsd &&
            pair.volume?.h24 >= args.minVolume24h &&
            (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0) >=
              args.minTxns24h &&
            pair.marketCap >= args.minMarketCap &&
            pair.marketCap <= args.maxMarketCap
          );
        })
        .map((pair: any) => {
          const metrics = this.calculateMetrics(pair);
          const score = this.calculateScore(metrics, args.scoreWeights);
          const analysis = this.analyzeToken(metrics, score);

          return {
            chainId: pair.chainId,
            address: pair.tokenAddress,
            price: parseFloat(pair.priceUsd || "0"),
            volume24h: pair.volume?.h24 || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            liquidity: pair.liquidity?.usd || 0,
            marketCap: pair.marketCap || 0,
            txCount24h:
              (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
            score,
            analysis,
          };
        })
        .sort((a: any, b: any) => b.score - a.score);

      if (analyzedTokens.length === 0) {
        return JSON.stringify({
          message: "No tokens found matching the criteria",
        });
      }

      return JSON.stringify({
        bestToken: analyzedTokens[0],
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return "Error analyzing tokens: Rate limit exceeded";
      }
      return `Error analyzing tokens: ${error}`;
    }
  }

  private calculateMetrics(pair: any) {
    return {
      liquidity: pair.liquidity?.usd || 0,
      volume: pair.volume?.h24 || 0,
      transactions: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
      priceChange: pair.priceChange?.h24 || 0,
      marketCap: pair.marketCap || 0,
    };
  }

  private calculateScore(metrics: any, weights: any = {}) {
    const defaultWeights = {
      liquidity: 0.25,
      volume: 0.25,
      transactions: 0.2,
      priceChange: 0.15,
      marketCap: 0.15,
      ...weights,
    };

    return (
      this.normalizeMetric(metrics.liquidity) * defaultWeights.liquidity +
      this.normalizeMetric(metrics.volume) * defaultWeights.volume +
      this.normalizeMetric(metrics.transactions) * defaultWeights.transactions +
      this.calculatePriceChangeScore(metrics.priceChange) *
        defaultWeights.priceChange +
      this.normalizeMetric(metrics.marketCap) * defaultWeights.marketCap
    );
  }

  private normalizeMetric(value: number): number {
    return Math.min(Math.max(value / 1000000, 0), 1);
  }

  private calculatePriceChangeScore(priceChange: number): number {
    if (priceChange > 0 && priceChange <= 30) {
      return priceChange / 30;
    } else if (priceChange > 30) {
      return 1 - (priceChange - 30) / 70;
    }
    return Math.max(0, (priceChange + 20) / 20);
  }

  private calculateAverageAge(tokens: any[]): string {
    if (tokens.length === 0) return "0 hours";
    const totalMinutes = tokens.reduce((sum, token) => {
      const [hours, minutes] = token.age
        .split(" hours")
        .join("")
        .split(" minutes")
        .filter(Boolean)
        .map(Number);
      return sum + (hours || 0) * 60 + (minutes || 0);
    }, 0);
    const avgMinutes = Math.round(totalMinutes / tokens.length);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return hours > 0
      ? `${hours} hours${minutes > 0 ? ` ${minutes} minutes` : ""}`
      : `${minutes} minutes`;
  }

  private calculateAverage(tokens: any[], field: string): number {
    if (tokens.length === 0) return 0;
    const sum = tokens.reduce((acc, token) => acc + token[field], 0);
    return Math.round(sum / tokens.length);
  }

  private analyzeToken(metrics: any, score: number) {
    const strengths: string[] = [];
    const risks: string[] = [];

    if (metrics.liquidity > 100000) strengths.push("High liquidity");
    if (metrics.volume > 50000) strengths.push("Strong volume");
    if (metrics.transactions > 100) strengths.push("Active trading");

    if (metrics.priceChange > 30) risks.push("High price volatility");
    if (metrics.liquidity < 75000) risks.push("Lower liquidity");
    if (metrics.transactions < 75) risks.push("Lower trading activity");

    return {
      liquidityScore: this.normalizeMetric(metrics.liquidity),
      volumeScore: this.normalizeMetric(metrics.volume),
      transactionScore: this.normalizeMetric(metrics.transactions),
      priceChangeScore: this.calculatePriceChangeScore(metrics.priceChange),
      marketCapScore: this.normalizeMetric(metrics.marketCap),
      strengths,
      risks,
    };
  }

  supportsNetwork(_: Network): boolean {
    return true; // Dexscreener supports multiple networks
  }
}

export const dexscreenerProvider = () => new DexscreenerActionProvider();
