// import { z } from "zod";
// import { ActionProvider } from "@coinbase/agentkit";
// import { CreateAction } from "@coinbase/agentkit/actionDecorator";
// import { Network } from "@coinbase/agentkit/network";
// import axios from "axios";

// // Define schemas
// const GetTokenPairDataSchema = z.object({
//   chainId: z.string().describe("The blockchain network ID"),
//   tokenAddress: z.string().describe("The token's contract address"),
// });

// const GetLatestTokensSchema = z.object({
//   minLiquidityUsd: z.number().optional().default(50000),
//   minVolume24h: z.number().optional().default(10000),
//   minTxns24h: z.number().optional().default(50),
//   limit: z.number().optional().default(10),
//   ageInHours: z.number().optional().default(24),
// });

// const GetBestTokenSchema = z.object({
//   minLiquidityUsd: z.number().optional().default(50000),
//   minVolume24h: z.number().optional().default(10000),
//   minTxns24h: z.number().optional().default(50),
//   minMarketCap: z.number().optional().default(1000000),
//   maxMarketCap: z.number().optional().default(100000000),
//   scoreWeights: z
//     .object({
//       liquidity: z.number().optional().default(0.25),
//       volume: z.number().optional().default(0.25),
//       transactions: z.number().optional().default(0.2),
//       priceChange: z.number().optional().default(0.15),
//       marketCap: z.number().optional().default(0.15),
//     })
//     .optional(),
// });

// export class DexscreenerActionProvider extends ActionProvider {
//   private lastRequestTime: number = 0;
//   private readonly baseUrl: string = "https://api.dexscreener.com/latest/dex";
//   private readonly minRequestInterval: number;
//   private readonly timeout: number;

//   constructor() {
//     super("dexscreener", []);

//     this.minRequestInterval = parseInt(
//       process.env.DEXSCREENER_REQUEST_INTERVAL || "1000"
//     );
//     this.timeout = parseInt(process.env.DEXSCREENER_TIMEOUT || "5000");
//   }

//   private async rateLimit() {
//     const now = Date.now();
//     const timeSinceLastRequest = now - this.lastRequestTime;
//     if (timeSinceLastRequest < this.minRequestInterval) {
//       await new Promise((resolve) =>
//         setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
//       );
//     }
//     this.lastRequestTime = Date.now();
//   }

//   @CreateAction({
//     name: "get_token_pair_data",
//     description: `
// This tool fetches detailed pair data for a specific token from Dexscreener.

// Input parameters:
// - chainId: The blockchain network ID
// - tokenAddress: The token's contract address

// A successful response will return pair data including:
//     {
//         "pairs": [{
//             "chainId": "solana",
//             "dexId": "raydium",
//             "priceUsd": "198.33",
//             "volume": { "h24": 642992391.92 },
//             "priceChange": { "h24": -6.5 },
//             "liquidity": { "usd": 12901953.04 },
//             "marketCap": 53280208197
//         }]
//     }

// A failure response will return an error message:
//     "Error fetching pair data: Rate limit exceeded"`,
//     schema: GetTokenPairDataSchema,
//   })
//   async getTokenPairData(
//     args: z.infer<typeof GetTokenPairDataSchema>
//   ): Promise<string> {
//     try {
//       await this.rateLimit();

//       const response = await axios.get(
//         `${this.baseUrl}/pairs/${args.chainId}/${args.tokenAddress}`,
//         { timeout: this.timeout }
//       );

//       return JSON.stringify({ pairs: response.data.pairs });
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response?.status === 429) {
//         return "Error fetching pair data: Rate limit exceeded";
//       }
//       return `Error fetching pair data: ${error}`;
//     }
//   }

//   @CreateAction({
//     name: "get_latest_tokens",
//     description: `
// This tool fetches and filters the most recently created tokens from Dexscreener.

// Input parameters:
// - minLiquidityUsd: Minimum USD liquidity (default: 50,000)
// - minVolume24h: Minimum 24h volume (default: 10,000)
// - minTxns24h: Minimum 24h transactions (default: 50)
// - limit: Maximum number of tokens to return (default: 10)
// - ageInHours: Maximum age of tokens in hours (default: 24)

// A successful response will return filtered latest tokens:
//     {
//         "tokens": [{
//             "chainId": "ethereum",
//             "address": "0x...",
//             "name": "New Token",
//             "symbol": "NTK",
//             "price": 1.23,
//             "volume24h": 500000,
//             "priceChange24h": 15.5,
//             "liquidity": 100000,
//             "pairCreatedAt": "2024-02-10T15:30:00Z",
//             "age": "2 hours"
//         }]
//     }

// A failure response will return an error message:
//     "Error fetching latest tokens: Rate limit exceeded"`,
//     schema: GetLatestTokensSchema,
//   })
//   async getLatestTokens(
//     args: z.infer<typeof GetLatestTokensSchema>
//   ): Promise<string> {
//     try {
//       await this.rateLimit();

//       const response = await axios.get(`${this.baseUrl}/pairs/latest`, {
//         timeout: this.timeout,
//       });

//       const currentTime = new Date();
//       const maxAgeMs = args.ageInHours * 60 * 60 * 1000;

//       const filteredTokens = response.data.pairs
//         .filter((pair: any) => {
//           const pairCreatedAt = new Date(pair.pairCreatedAt);
//           const ageMs = currentTime.getTime() - pairCreatedAt.getTime();

//           return (
//             pair &&
//             ageMs <= maxAgeMs &&
//             pair.liquidity?.usd >= args.minLiquidityUsd &&
//             pair.volume?.h24 >= args.minVolume24h &&
//             (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0) >=
//               args.minTxns24h
//           );
//         })
//         .slice(0, args.limit)
//         .map((pair: any) => {
//           const pairCreatedAt = new Date(pair.pairCreatedAt);
//           const ageMs = currentTime.getTime() - pairCreatedAt.getTime();
//           const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
//           const ageMinutes = Math.floor(
//             (ageMs % (1000 * 60 * 60)) / (1000 * 60)
//           );

//           return {
//             chainId: pair.chainId,
//             address: pair.tokenAddress,
//             name: pair.baseToken.name,
//             symbol: pair.baseToken.symbol,
//             price: parseFloat(pair.priceUsd || "0"),
//             volume24h: pair.volume?.h24 || 0,
//             priceChange24h: pair.priceChange?.h24 || 0,
//             liquidity: pair.liquidity?.usd || 0,
//             pairCreatedAt: pair.pairCreatedAt,
//             age:
//               ageHours > 0
//                 ? `${ageHours} hours${
//                     ageMinutes > 0 ? ` ${ageMinutes} minutes` : ""
//                   }`
//                 : `${ageMinutes} minutes`,
//           };
//         })
//         .sort(
//           (a: any, b: any) =>
//             new Date(b.pairCreatedAt).getTime() -
//             new Date(a.pairCreatedAt).getTime()
//         );

//       return JSON.stringify({
//         tokens: filteredTokens,
//         summary: {
//           total: filteredTokens.length,
//           averageAge: this.calculateAverageAge(filteredTokens),
//           averageLiquidity: this.calculateAverage(filteredTokens, "liquidity"),
//           averageVolume: this.calculateAverage(filteredTokens, "volume24h"),
//         },
//       });
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response?.status === 429) {
//         return "Error fetching latest tokens: Rate limit exceeded";
//       }
//       return `Error fetching latest tokens: ${error}`;
//     }
//   }

//   @CreateAction({
//     name: "get_best_token",
//     description: `
// This tool analyzes trending tokens and returns the best investment opportunity based on multiple metrics.

// Input parameters:
// - minLiquidityUsd: Minimum USD liquidity (default: 50,000)
// - minVolume24h: Minimum 24h volume (default: 10,000)
// - minTxns24h: Minimum 24h transactions (default: 50)
// - minMarketCap: Minimum market cap (default: 1,000,000)
// - maxMarketCap: Maximum market cap (default: 100,000,000)
// - scoreWeights: Optional custom weights for scoring metrics

// A successful response will return the best token with detailed analysis:
//     {
//         "bestToken": {
//             "chainId": "ethereum",
//             "address": "0x...",
//             "price": 1.23,
//             "volume24h": 500000,
//             "priceChange24h": 15.5,
//             "liquidity": 100000,
//             "marketCap": 5000000,
//             "txCount24h": 150,
//             "score": 0.85,
//             "analysis": {
//                 "liquidityScore": 0.8,
//                 "volumeScore": 0.9,
//                 "transactionScore": 0.7,
//                 "priceChangeScore": 0.85,
//                 "marketCapScore": 0.9,
//                 "strengths": ["High liquidity", "Strong volume"],
//                 "risks": ["Price volatility"]
//             }
//         }
//     }

// A failure response will return an error message:
//     "Error analyzing tokens: Rate limit exceeded"`,
//     schema: GetBestTokenSchema,
//   })
//   async getBestToken(
//     args: z.infer<typeof GetBestTokenSchema>
//   ): Promise<string> {
//     try {
//       await this.rateLimit();

//       const response = await axios.get(`${this.baseUrl}/tokens/trending`, {
//         timeout: this.timeout,
//       });

//       const analyzedTokens = response.data.pairs
//         .filter((pair: any) => {
//           return (
//             pair &&
//             pair.liquidity?.usd >= args.minLiquidityUsd &&
//             pair.volume?.h24 >= args.minVolume24h &&
//             (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0) >=
//               args.minTxns24h &&
//             pair.marketCap >= args.minMarketCap &&
//             pair.marketCap <= args.maxMarketCap
//           );
//         })
//         .map((pair: any) => {
//           const metrics = this.calculateMetrics(pair);
//           const score = this.calculateScore(metrics, args.scoreWeights);
//           const analysis = this.analyzeToken(metrics, score);

//           return {
//             chainId: pair.chainId,
//             address: pair.tokenAddress,
//             price: parseFloat(pair.priceUsd || "0"),
//             volume24h: pair.volume?.h24 || 0,
//             priceChange24h: pair.priceChange?.h24 || 0,
//             liquidity: pair.liquidity?.usd || 0,
//             marketCap: pair.marketCap || 0,
//             txCount24h:
//               (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
//             score,
//             analysis,
//           };
//         })
//         .sort((a: any, b: any) => b.score - a.score);

//       if (analyzedTokens.length === 0) {
//         return JSON.stringify({
//           message: "No tokens found matching the criteria",
//         });
//       }

//       return JSON.stringify({
//         bestToken: analyzedTokens[0],
//       });
//     } catch (error) {
//       if (axios.isAxiosError(error) && error.response?.status === 429) {
//         return "Error analyzing tokens: Rate limit exceeded";
//       }
//       return `Error analyzing tokens: ${error}`;
//     }
//   }

//   private calculateMetrics(pair: any) {
//     return {
//       liquidity: pair.liquidity?.usd || 0,
//       volume: pair.volume?.h24 || 0,
//       transactions: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
//       priceChange: pair.priceChange?.h24 || 0,
//       marketCap: pair.marketCap || 0,
//     };
//   }

//   private calculateScore(metrics: any, weights: any = {}) {
//     const defaultWeights = {
//       liquidity: 0.25,
//       volume: 0.25,
//       transactions: 0.2,
//       priceChange: 0.15,
//       marketCap: 0.15,
//       ...weights,
//     };

//     return (
//       this.normalizeMetric(metrics.liquidity) * defaultWeights.liquidity +
//       this.normalizeMetric(metrics.volume) * defaultWeights.volume +
//       this.normalizeMetric(metrics.transactions) * defaultWeights.transactions +
//       this.calculatePriceChangeScore(metrics.priceChange) *
//         defaultWeights.priceChange +
//       this.normalizeMetric(metrics.marketCap) * defaultWeights.marketCap
//     );
//   }

//   private normalizeMetric(value: number): number {
//     return Math.min(Math.max(value / 1000000, 0), 1);
//   }

//   private calculatePriceChangeScore(priceChange: number): number {
//     if (priceChange > 0 && priceChange <= 30) {
//       return priceChange / 30;
//     } else if (priceChange > 30) {
//       return 1 - (priceChange - 30) / 70;
//     }
//     return Math.max(0, (priceChange + 20) / 20);
//   }

//   private calculateAverageAge(tokens: any[]): string {
//     if (tokens.length === 0) return "0 hours";
//     const totalMinutes = tokens.reduce((sum, token) => {
//       const [hours, minutes] = token.age
//         .split(" hours")
//         .join("")
//         .split(" minutes")
//         .filter(Boolean)
//         .map(Number);
//       return sum + (hours || 0) * 60 + (minutes || 0);
//     }, 0);
//     const avgMinutes = Math.round(totalMinutes / tokens.length);
//     const hours = Math.floor(avgMinutes / 60);
//     const minutes = avgMinutes % 60;
//     return hours > 0
//       ? `${hours} hours${minutes > 0 ? ` ${minutes} minutes` : ""}`
//       : `${minutes} minutes`;
//   }

//   private calculateAverage(tokens: any[], field: string): number {
//     if (tokens.length === 0) return 0;
//     const sum = tokens.reduce((acc, token) => acc + token[field], 0);
//     return Math.round(sum / tokens.length);
//   }

//   private analyzeToken(metrics: any, score: number) {
//     const strengths: string[] = [];
//     const risks: string[] = [];

//     if (metrics.liquidity > 100000) strengths.push("High liquidity");
//     if (metrics.volume > 50000) strengths.push("Strong volume");
//     if (metrics.transactions > 100) strengths.push("Active trading");

//     if (metrics.priceChange > 30) risks.push("High price volatility");
//     if (metrics.liquidity < 75000) risks.push("Lower liquidity");
//     if (metrics.transactions < 75) risks.push("Lower trading activity");

//     return {
//       liquidityScore: this.normalizeMetric(metrics.liquidity),
//       volumeScore: this.normalizeMetric(metrics.volume),
//       transactionScore: this.normalizeMetric(metrics.transactions),
//       priceChangeScore: this.calculatePriceChangeScore(metrics.priceChange),
//       marketCapScore: this.normalizeMetric(metrics.marketCap),
//       strengths,
//       risks,
//     };
//   }

//   supportsNetwork(_: Network): boolean {
//     return true; // Dexscreener supports multiple networks
//   }
// }

// export const dexscreenerProvider = () => new DexscreenerActionProvider();
