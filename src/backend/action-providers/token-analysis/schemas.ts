import { z } from "zod";

// Define schemas
export const TokenAnalysisSchema = z.object({
  tokenAddress: z.string().describe("The token's contract address"),
});
