import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";
import { GetTweetsByTokenSchema } from "../action-providers/twitter/schemas";

export class TwitterService {
  private lastSearchTime: number = 0;
  private readonly FIFTEEN_MINUTES =
    parseInt(process.env.TWITTER_RATE_LIMIT_MINUTES || "15") * 60 * 1000;

  constructor(private readonly client: TwitterApi) {}

  private async checkSearchRateLimit() {
    const now = Date.now();
    const timeElapsed = now - this.lastSearchTime;

    if (timeElapsed < this.FIFTEEN_MINUTES) {
      const waitTime = this.FIFTEEN_MINUTES - timeElapsed;
      console.log(
        `Rate limit: Waiting ${waitTime / 1000} seconds before next search`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastSearchTime = now;
  }

  async getTweetsByToken(
    args: z.infer<typeof GetTweetsByTokenSchema>
  ): Promise<string> {
    try {
      await this.checkSearchRateLimit();

      const searchQuery = `${args.tokenAddress}`;

      const tweets = await this.client.v2.search({
        query: searchQuery,
        max_results: 10,
        "tweet.fields": ["public_metrics", "created_at"],
      });

      if (!tweets.data || tweets.data.data.length === 0) {
        return "No tweets found for this token";
      }

      let formattedOutput = "";
      tweets.data.data.forEach((tweet, index) => {
        formattedOutput += `Tweet ${index + 1}:\n`;
        formattedOutput += `Content: ${tweet.text}\n`;
        formattedOutput += `Engagement:\n`;
        formattedOutput += `- Likes: ${
          tweet.public_metrics?.like_count || 0
        }\n`;
        formattedOutput += `- Retweets: ${
          tweet.public_metrics?.retweet_count || 0
        }\n`;
        formattedOutput += `- Replies: ${
          tweet.public_metrics?.reply_count || 0
        }\n`;
        formattedOutput += `Created At: ${tweet.created_at}\n`;
        formattedOutput += `URL: https://twitter.com/i/web/status/${tweet.id}\n\n`;
      });

      return formattedOutput;
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        return "Error retrieving tweets: Rate limit exceeded. Try again in 15 minutes.";
      }
      return `Error retrieving tweets: ${error}`;
    }
  }
}
