import { z } from "zod";
import { ActionProvider, Network, CreateAction } from "@coinbase/agentkit";
import { TwitterApi, TwitterApiTokens } from "twitter-api-v2";
import {
  TwitterAccountDetailsSchema,
  TwitterAccountMentionsSchema,
  TwitterPostTweetSchema,
  TwitterPostTweetReplySchema,
  GetTweetsByTokenSchema,
} from "./schemas";

/**
 * Configuration options for the TwitterActionProvider.
 */
export interface TwitterActionProviderConfig {
  /**
   * Twitter API Key
   */
  apiKey?: string;

  /**
   * Twitter API Secret
   */
  apiSecret?: string;

  /**
   * Twitter Access Token
   */
  accessToken?: string;

  /**
   * Twitter Access Token Secret
   */
  accessTokenSecret?: string;
}

/**
 * TwitterActionProvider is an action provider for Twitter (X) interactions.
 *
 * @augments ActionProvider
 */
export class CustomTwitterActionProvider extends ActionProvider {
  private readonly client: TwitterApi;
  private lastSearchTime: number = 0;
  private readonly FIFTEEN_MINUTES =
    parseInt(process.env.TWITTER_RATE_LIMIT_MINUTES || "15") * 60 * 1000;

  /**
   * Constructor for the TwitterActionProvider class.
   *
   * @param config - The configuration options for the TwitterActionProvider
   */
  constructor(config: TwitterActionProviderConfig = {}) {
    super("twitter", []);

    config.apiKey ||= process.env.TWITTER_API_KEY;
    config.apiSecret ||= process.env.TWITTER_API_SECRET;
    config.accessToken ||= process.env.TWITTER_ACCESS_TOKEN;
    config.accessTokenSecret ||= process.env.TWITTER_ACCESS_TOKEN_SECRET;

    if (!config.apiKey) {
      throw new Error("TWITTER_API_KEY is not configured.");
    }
    if (!config.apiSecret) {
      throw new Error("TWITTER_API_SECRET is not configured.");
    }
    if (!config.accessToken) {
      throw new Error("TWITTER_ACCESS_TOKEN is not configured.");
    }
    if (!config.accessTokenSecret) {
      throw new Error("TWITTER_ACCESS_TOKEN_SECRET is not configured.");
    }

    this.client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    } as TwitterApiTokens);
  }

  /**
   * Get account details for the currently authenticated Twitter (X) user.
   *
   * @param _ - Empty parameter object (not used)
   * @returns A JSON string containing the account details or error message
   */
  @CreateAction({
    name: "account_details",
    description: `
This tool will return account details for the currently authenticated Twitter (X) user context.

A successful response will return a message with the api response as a json payload:
    {"data": {"id": "1853889445319331840", "name": "CDP AgentKit", "username": "CDPAgentKit"}}

A failure response will return a message with a Twitter API request error:
    Error retrieving authenticated user account: 429 Too Many Requests`,
    schema: TwitterAccountDetailsSchema,
  })
  async accountDetails(
    _: z.infer<typeof TwitterAccountDetailsSchema>
  ): Promise<string> {
    try {
      const response = await this.client.v2.me();
      response.data.url = `https://x.com/${response.data.username}`;
      return `Successfully retrieved authenticated user account details:\n${JSON.stringify(
        response
      )}`;
    } catch (error) {
      return `Error retrieving authenticated user account details: ${error}`;
    }
  }

  /**
   * Get mentions for a specified Twitter (X) user.
   *
   * @param args - The arguments containing userId
   * @returns A JSON string containing the mentions or error message
   */
  @CreateAction({
    name: "account_mentions",
    description: `
This tool will return mentions for the specified Twitter (X) user id.

A successful response will return a message with the API response as a JSON payload:
    {"data": [{"id": "1857479287504584856", "text": "@CDPAgentKit reply"}]}

A failure response will return a message with the Twitter API request error:
    Error retrieving user mentions: 429 Too Many Requests`,
    schema: TwitterAccountMentionsSchema,
  })
  async accountMentions(
    args: z.infer<typeof TwitterAccountMentionsSchema>
  ): Promise<string> {
    try {
      const response = await this.client.v2.userMentionTimeline(args.userId);
      return `Successfully retrieved account mentions:\n${JSON.stringify(
        response
      )}`;
    } catch (error) {
      return `Error retrieving authenticated account mentions: ${error}`;
    }
  }

  /**
   * Post a tweet on Twitter (X).
   *
   * @param args - The arguments containing the tweet text
   * @returns A JSON string containing the posted tweet details or error message
   */
  @CreateAction({
    name: "post_tweet",
    description: `
This tool will post a tweet on Twitter. The tool takes the text of the tweet as input. Tweets can be maximum 280 characters.

A successful response will return a message with the API response as a JSON payload:
    {"data": {"text": "hello, world!", "id": "0123456789012345678", "edit_history_tweet_ids": ["0123456789012345678"]}}

A failure response will return a message with the Twitter API request error:
    You are not allowed to create a Tweet with duplicate content.`,
    schema: TwitterPostTweetSchema,
  })
  async postTweet(
    args: z.infer<typeof TwitterPostTweetSchema>
  ): Promise<string> {
    try {
      const response = await this.client.v2.tweet(args.tweet);
      return `Successfully posted to Twitter:\n${JSON.stringify(response)}`;
    } catch (error) {
      return `Error posting to Twitter:\n${error}`;
    }
  }

  /**
   * Post a reply to a tweet on Twitter (X).
   *
   * @param args - The arguments containing the reply text and tweet ID
   * @returns A JSON string containing the posted reply details or error message
   */
  @CreateAction({
    name: "post_tweet_reply",
    description: `
This tool will post a tweet on Twitter. The tool takes the text of the tweet as input. Tweets can be maximum 280 characters.

A successful response will return a message with the API response as a JSON payload:
    {"data": {"text": "hello, world!", "id": "0123456789012345678", "edit_history_tweet_ids": ["0123456789012345678"]}}

A failure response will return a message with the Twitter API request error:
    You are not allowed to create a Tweet with duplicate content.`,
    schema: TwitterPostTweetReplySchema,
  })
  async postTweetReply(
    args: z.infer<typeof TwitterPostTweetReplySchema>
  ): Promise<string> {
    try {
      const response = await this.client.v2.tweet(args.tweetReply, {
        reply: { in_reply_to_tweet_id: args.tweetId },
      });

      return `Successfully posted reply to Twitter:\n${JSON.stringify(
        response
      )}`;
    } catch (error) {
      return `Error posting reply to Twitter: ${error}`;
    }
  }

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

  @CreateAction({
    name: "get_tweets_by_token",
    description: `Searches for tweets about a specific cryptocurrency token using its address.
Input parameters:
- tokenAddress: The token's contract address
Returns: Formatted list of tweets with engagement metrics.`,
    schema: GetTweetsByTokenSchema,
  })
  async getTweetsByToken(
    args: z.infer<typeof GetTweetsByTokenSchema>
  ): Promise<string> {
    try {
      await this.checkSearchRateLimit();

      const searchQuery = `${args.tokenAddress}`;

      const tweets = await this.client.v2.search({
        query: searchQuery,
        max_results: 10, // Static limit for now
        "tweet.fields": ["public_metrics", "created_at"], // Only include public metrics and created_at for now
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

  /**
   * Checks if the Twitter action provider supports the given network.
   * Twitter actions don't depend on blockchain networks, so always return true.
   *
   * @param _ - The network to check (not used)
   * @returns Always returns true as Twitter actions are network-independent
   */
  supportsNetwork(_: Network): boolean {
    return true;
  }
}

/**
 * Factory function to create a new TwitterActionProvider instance.
 *
 * @param config - The configuration options for the TwitterActionProvider
 * @returns A new instance of TwitterActionProvider
 */
export const customTwitterActionProvider = (
  config: TwitterActionProviderConfig = {}
) => new CustomTwitterActionProvider(config);
