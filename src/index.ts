import { DexscreenerService } from "./services/dexscreener";
import { TwitterService } from "./services/twitter";
import { SentimentAnalyzer } from "./services/sentiment";
import { SchedulerService } from "./services/scheduler";
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

export class TokenPulse {
  private dexscreener: DexscreenerService;
  private twitter: TwitterService;
  private analyzer: SentimentAnalyzer | null = null;
  private isProcessing: boolean = false;

  constructor() {
    this.dexscreener = new DexscreenerService();
    this.twitter = new TwitterService();
  }

  async initialize() {
    if (!this.analyzer) {
      // Check if analyzer needs initialization
      this.analyzer = await SentimentAnalyzer.getInstance();
    }
  }

  async run() {
    if (this.isProcessing) {
      console.log("Already processing. Please wait.");
      return;
    }

    this.isProcessing = true;

    try {
      await this.initialize();
      const token = await this.dexscreener.getTopBoostToken();

      try {
        console.log(
          `Processing token on ${token.chainId}: ${token.tokenAddress}`
        );
        // const limit = 10;
        // const tweets = await this.twitter.getTweetsByToken(token, limit);

        // if (tweets.length === 0) {
        //   console.log(`No tweets found for token ${token.tokenAddress}`);
        //   return;
        // }
        // // Analyze all tweets at once
        // const sentiment = await this.analyzer!.analyzeTweets(tweets);

        // // Generate report using the aggregated sentiment
        // const report = this.generateReport(token, sentiment, limit);

        // // Post to Twitter
        // await this.postToTwitter(report);
      } catch (error) {
        console.error(`Error processing token ${token.tokenAddress}:`, error);
      }
    } catch (error) {
      console.error("Error in TokenPulse:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private generateReport(
    token: Token,
    sentiment: SentimentAnalysis,
    limit: number
  ): TokenReport {
    return {
      token: token,
      timestamp: new Date(),
      overallSentiment: sentiment.sentiment,
      confidenceScore: sentiment.confidence,
      supportingArguments: sentiment.arguments,
      analyzedTweets: limit,
    };
  }

  private async postToTwitter(report: TokenReport) {
    const tweetText = `
🔍 Token Analysis (${report.token.chainId}):
${report.token.description.slice(0, 50)}...

${report.overallSentiment.toUpperCase()} (${(
      report.confidenceScore * 100
    ).toFixed(1)}% confidence)

Key Points:
${report.supportingArguments
  .slice(0, Math.min(2, report.supportingArguments.length))
  .map((arg) => `• ${arg}`)
  .join("\n")}

Based on ${report.analyzedTweets} tweets
#crypto #analysis
        `.trim();

    await this.twitter.postReport(tweetText);
  }
}

// Application startup
async function startApplication() {
  try {
    const tokenPulse = new TokenPulse();
    const scheduler = new SchedulerService(tokenPulse);

    // Handle graceful shutdown
    process.on("SIGTERM", () => {
      console.log("Received SIGTERM. Shutting down gracefully...");
      scheduler.stop();
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("Received SIGINT. Shutting down gracefully...");
      scheduler.stop();
      process.exit(0);
    });

    // Start the scheduler
    scheduler.start();
  } catch (error) {
    console.error("Error starting application:", error);
    process.exit(1);
  }
}

startApplication();
