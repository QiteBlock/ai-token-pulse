import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { Network } from "@coinbase/agentkit";
import axios from "axios";
import {
  GetLatestTokensSchema,
  GetBestTokenSchema,
  GetTokenPairDataSchema,
} from "./schemas";
import { DexscreenerLink, DexscreenerToken } from "../../types/interfaces";
import { DexscreenerService } from "../../services/dexscreener";

export class DexscreenerActionProvider extends ActionProvider {
  private readonly dexscreenerService: DexscreenerService;
  constructor() {
    super("dexscreener", []);
    this.dexscreenerService = new DexscreenerService();
  }

  @CreateAction({
    name: "get_latest_tokens",
    description: `Fetches recently created tokens with their metadata. Parameters:
- limit: Maximum number of tokens to return (default: 5)
Returns: Formatted list of tokens with their details and social links.`,
    schema: GetLatestTokensSchema,
  })
  async getLatestTokens(
    args: z.infer<typeof GetLatestTokensSchema>
  ): Promise<string> {
    try {
      const response = await this.dexscreenerService.getLatestTokens();
      let tokens: DexscreenerToken[] = response.slice(0, args.limit);
      let formattedOutput = "";

      if (tokens.length > args.limit) {
        tokens = tokens.slice(0, args.limit);
      }

      tokens.forEach((token: any, index: number) => {
        formattedOutput += `Token ${index + 1}:\n`;
        formattedOutput += `Token Address: ${token.tokenAddress}\n`;
        formattedOutput += `Chain: ${token.chainId}\n`;
        formattedOutput += `URL: ${token.url}\n`;

        if (token.links && Object.keys(token.links).length > 0) {
          formattedOutput += `Social Media:\n`;
          token.links.forEach((link: DexscreenerLink) => {
            formattedOutput += `- Type: ${link.type || ""} ${
              link.label || ""
            }\n  URL: ${link.url || ""}\n`;
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
    description: `Analyzes and finds the best token from latest tokens based on metrics. 
Returns: Best token with its details.`,
    schema: GetBestTokenSchema,
  })
  async getBestToken(
    args: z.infer<typeof GetBestTokenSchema>
  ): Promise<string> {
    try {
      const bestToken = await this.dexscreenerService.getBestToken();

      if (!bestToken) {
        return JSON.stringify({
          message: "No tokens found matching the criteria",
        });
      }

      // Format token details
      let formattedOutput = `Best Token Analysis:\n\n`;
      formattedOutput += `Token Address: ${bestToken.tokenAddress}\n`;
      formattedOutput += `Chain: ${bestToken.chainId}\n`;
      formattedOutput += `URL: ${bestToken.url}\n\n`;

      // Add metrics
      formattedOutput += `Key Metrics:\n`;
      formattedOutput += `Price: $${bestToken.price.toFixed(6)}\n`;
      formattedOutput += `24h Volume: $${bestToken.volume24h.toLocaleString()}\n`;
      formattedOutput += `Liquidity: $${bestToken.liquidity.toLocaleString()}\n`;
      formattedOutput += `24h Price Change: ${bestToken.priceChange24h.toFixed(
        2
      )}%\n`;
      formattedOutput += `24h Transactions: ${bestToken.txCount24h}\n`;
      formattedOutput += `Market Cap: $${bestToken.marketCap.toLocaleString()}\n\n`;

      if (bestToken.description) {
        formattedOutput += `Description: ${bestToken.description}\n\n`;
      }

      if (bestToken.links && bestToken.links.length > 0) {
        formattedOutput += `Social Media Links:\n`;
        bestToken.links.forEach((link) => {
          formattedOutput += `- ${link.label}: ${link.url}\n`;
        });
      }

      return formattedOutput;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return "Error analyzing tokens: Rate limit exceeded";
      }
      return `Error analyzing tokens: ${error}`;
    }
  }

  @CreateAction({
    name: "get_token_pair_data",
    description: `Gets detailed data for a specific token pair. Parameters:
- chainId: Blockchain network ID (e.g., "ethereum", "bsc")
- tokenAddress: Token contract address
Returns: Price, volume, liquidity metrics for the token.`,
    schema: GetTokenPairDataSchema,
  })
  async getTokenPairData(
    args: z.infer<typeof GetTokenPairDataSchema>
  ): Promise<string> {
    try {
      const response = await this.dexscreenerService.getTokenPairData(
        args.chainId,
        args.tokenAddress
      );

      // Find the most relevant pair (highest liquidity)
      const mostRelevantPair = response
        .filter((pair: any) => pair.chainId === args.chainId)
        .sort(
          (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];

      if (!mostRelevantPair) {
        return `No pair found for chain ${args.chainId}`;
      }

      let formattedOutput = "Token Pair Data:\n";
      formattedOutput += `Chain: ${mostRelevantPair.chainId}\n`;
      formattedOutput += `DEX: ${mostRelevantPair.dexId}\n`;
      formattedOutput += `Token Address: ${mostRelevantPair.baseToken.address}\n`;
      formattedOutput += `Pair Address: ${mostRelevantPair.pairAddress}\n`;
      formattedOutput += `Token Name: ${mostRelevantPair.baseToken.name}\n`;
      formattedOutput += `Symbol: ${mostRelevantPair.baseToken.symbol}\n\n`;

      formattedOutput += "Price Metrics:\n";
      formattedOutput += `Price USD: $${parseFloat(
        mostRelevantPair.priceUsd || "0"
      ).toFixed(8)}\n`;
      formattedOutput += `Price Native: ${parseFloat(
        mostRelevantPair.priceNative || "0"
      ).toFixed(8)}\n`;
      formattedOutput += `24h Change: ${
        mostRelevantPair.priceChange?.h24 || 0
      }%\n\n`;

      formattedOutput += "Volume & Liquidity:\n";
      formattedOutput += `24h Volume: $${(
        mostRelevantPair.volume?.h24 || 0
      ).toLocaleString()}\n`;
      formattedOutput += `Liquidity USD: $${(
        mostRelevantPair.liquidity?.usd || 0
      ).toLocaleString()}\n`;

      if (mostRelevantPair.txns?.h24) {
        formattedOutput += "\nTransactions (24h):\n";
        formattedOutput += `Buys: ${mostRelevantPair.txns.h24.buys || 0}\n`;
        formattedOutput += `Sells: ${mostRelevantPair.txns.h24.sells || 0}\n`;
      }

      return formattedOutput;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return "Error: Rate limit exceeded. Please try again later.";
      }
      return `Error fetching pair data: ${error}`;
    }
  }

  supportsNetwork(_: Network): boolean {
    return true; // Dexscreener supports multiple networks
  }
}

export const dexscreenerProvider = () => new DexscreenerActionProvider();
