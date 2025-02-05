import { DexscreenerService } from "./services/dexscreener";
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
  private isProcessing: boolean = false;

  constructor() {
    this.dexscreener = new DexscreenerService();
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
