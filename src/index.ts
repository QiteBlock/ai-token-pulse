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
  private isProcessing: boolean = false;

  async run() {
    if (this.isProcessing) {
      console.log("Already processing. Please wait.");
      return;
    }

    this.isProcessing = true;
  }
}

// Run the application
const app = new TokenPulse();
app.run();
