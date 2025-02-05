import { z } from "zod";
import { ActionProvider } from "@coinbase/agentkit";
import { CreateAction } from "@coinbase/agentkit";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { TokenAnalysisSchema } from "./schemas";
import { Network } from "@coinbase/agentkit";
import { DexscreenerService } from "../../services/dexscreener";
import { CustomTwitterActionProvider } from "../twitter/twitterActionProvider";
export class TokenAnalysisProvider extends ActionProvider {
  private llm: ChatOpenAI;
  private dexscreenerService: DexscreenerService;
  private twitterActionProvider: CustomTwitterActionProvider;

  constructor() {
    super("token-analysis", []);
    this.llm = new ChatOpenAI({ model: "gpt-4" });
    this.dexscreenerService = new DexscreenerService();
    this.twitterActionProvider = new CustomTwitterActionProvider();
  }

  @CreateAction({
    name: "analyze_token",
    description: `Provides comprehensive token analysis including market data, social metrics, and sentiment analysis.
Parameters:
- tokenAddress: Token contract address`,
    schema: TokenAnalysisSchema,
  })
  async analyzeToken(
    args: z.infer<typeof TokenAnalysisSchema>
  ): Promise<string> {
    try {
      // Get market data
      const bestToken = await this.dexscreenerService.getBestToken();

      // Get social data
      const socialData = await this.twitterActionProvider.getTweetsByToken({
        tokenAddress: args.tokenAddress,
      });

      // Prepare data for sentiment analysis
      const messages = [
        new SystemMessage(
          "You are a cryptocurrency sentiment analysis expert. Analyze the token market data and tweets to provide a comprehensive analysis."
        ),
        new HumanMessage(`
                    Analyze this token data:

                    Token Market Data:
                    ${bestToken}

                    Social Activity:
                    ${socialData}

                    Provide:
                    1. Overall sentiment analysis (bullish/bearish)
                    2. Confidence level (0-1)
                    3. Key supporting arguments from both market and social data
                    4. Risk assessment
                    5. Brief analysis of market metrics
                    6. Brief analysis of social sentiment
                `),
      ];

      // Get sentiment analysis
      const analysis = await this.llm.invoke(messages);

      // Format final report
      let report = "=== Token Sentiment Analysis Report ===\n\n";

      report += analysis.content;

      return report;
    } catch (error) {
      return `Error analyzing token: ${error}`;
    }
  }

  supportsNetwork(_: Network): boolean {
    return true; // Dexscreener supports multiple networks
  }
}

export const tokenAnalysisProvider = () => new TokenAnalysisProvider();
