import { z } from "zod";

// Define schemas
export const GetTokenPairDataSchema = z.object({
  chainId: z.string().describe("The blockchain network ID"),
  tokenAddress: z.string().describe("The token's contract address"),
});

export const GetLatestTokensSchema = z.object({
  limit: z.number().optional().default(10),
});

export const GetBestTokenSchema = z.object({});
