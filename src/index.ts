import { DexscreenerService } from "./services/dexscreener";
import { TwitterService } from "./services/twitter";
import {
  Token,
  TokenReport,
  SentimentAnalysis,
  AnalyzerConfig,
  TweetData,
  AnalysisResult,
} from "./types/interfaces";
import dotenv from "dotenv";

dotenv.config();

class TokenPulse {
  private dexscreener: DexscreenerService;
  private twitter: TwitterService;
  private isProcessing: boolean = false;

  constructor() {
    this.dexscreener = new DexscreenerService();
    this.twitter = new TwitterService();
  }

  async run() {
    if (this.isProcessing) {
      console.log("Already processing. Please wait.");
      return;
    }

    this.isProcessing = true;

    try {
      const token = await this.dexscreener.getTopBoostToken();

      try {
        console.log(
          `Processing token on ${token.chainId}: ${token.tokenAddress}`
        );
        const limit = 10;
        const tweets = await this.twitter.getTweetsByToken(token, limit);
      } catch (error) {
        console.error(`Error processing token ${token.tokenAddress}:`, error);
      }
    } catch (error) {
      console.error("Error in TokenPulse:", error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Run the application
const app = new TokenPulse();
app.run();
