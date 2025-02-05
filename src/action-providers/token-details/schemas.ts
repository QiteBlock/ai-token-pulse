import { z } from "zod";

// Define schemas
export const GetTokenPairDataSchema = z.object({
  chainId: z.string().describe("The blockchain network ID"),
  tokenAddress: z.string().describe("The token's contract address"),
});

export const GetLatestTokensSchema = z.object({
  limit: z.number().optional().default(10),
});

export const GetBestTokenSchema = z.object({
  minLiquidityUsd: z.number().optional().default(50000),
  minVolume24h: z.number().optional().default(10000),
  minTxns24h: z.number().optional().default(50),
  minMarketCap: z.number().optional().default(1000000),
  maxMarketCap: z.number().optional().default(100000000),
  scoreWeights: z
    .object({
      liquidity: z.number().optional().default(0.25),
      volume: z.number().optional().default(0.25),
      transactions: z.number().optional().default(0.2),
      priceChange: z.number().optional().default(0.15),
      marketCap: z.number().optional().default(0.15),
    })
    .optional(),
});
