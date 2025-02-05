// import { z } from "zod";
// import {
//   TwitterActionProvider,
//   TwitterActionProviderConfig,
// } from "@coinbase/agentkit";
// import { CreateAction } from "@coinbase/agentkit";
// import { Tweet, Token } from "../types/interfaces";

// // Schema for getTweetsByToken action

// export class TokenTwitterProvider extends TwitterActionProvider {
//   private lastSearchTime: number = 0;
//   private readonly FIFTEEN_MINUTES =
//     parseInt(process.env.TWITTER_RATE_LIMIT_MINUTES || "15") * 60 * 1000;

//   constructor(config: TwitterActionProviderConfig = {}) {
//     super(config);
//   }

//   private async checkSearchRateLimit() {
//     const now = Date.now();
//     const timeElapsed = now - this.lastSearchTime;

//     if (timeElapsed < this.FIFTEEN_MINUTES) {
//       const waitTime = this.FIFTEEN_MINUTES - timeElapsed;
//       console.log(
//         `Rate limit: Waiting ${waitTime / 1000} seconds before next search`
//       );
//       await new Promise((resolve) => setTimeout(resolve, waitTime));
//     }

//     this.lastSearchTime = now;
//   }

//   @CreateAction({
//     name: "get_tweets_by_token",
//     description: `
// This tool searches for tweets about a specific cryptocurrency token using its address and chain ID.

// Input parameters:
// - tokenAddress: The token's contract address

// A successful response will return tweets with engagement metrics:
//     {
//         "data": [
//             {
//                 "id": "123456789",
//                 "text": "Tweet content about the token",
//                 "engagement": {
//                     "likes": 10,
//                     "retweets": 5,
//                     "replies": 2
//                 },
//                 "created_at": "2024-02-03T15:44:47.000Z"
//             }
//         ]
//     }

// A failure response will return an error message:
//     "Error retrieving tweets: Rate limit exceeded. Try again in 15 minutes."`,
//     schema: GetTweetsByTokenSchema,
//   })
//   async getTweetsByToken(
//     args: z.infer<typeof GetTweetsByTokenSchema>
//   ): Promise<string> {
//     try {
//       await this.checkSearchRateLimit();

//       const searchQuery = `${args.tokenAddress}`;

//       const tweets = await this.client.v2.search({
//         query: searchQuery,
//         max_results: Math.min(args.limit, 10),
//         "tweet.fields": ["public_metrics", "created_at"],
//       });

//       if (!tweets.data || tweets.data.length === 0) {
//         return JSON.stringify({ data: [] });
//       }

//       const formattedTweets = tweets.data.data.map((tweet) => ({
//         id: tweet.id,
//         text: tweet.text,
//         created_at: tweet.created_at,
//         engagement: {
//           likes: tweet.public_metrics?.like_count || 0,
//           retweets: tweet.public_metrics?.retweet_count || 0,
//           replies: tweet.public_metrics?.reply_count || 0,
//         },
//       }));

//       return JSON.stringify({ data: formattedTweets });
//     } catch (error) {
//       if (error instanceof Error && error.message.includes("429")) {
//         return "Error retrieving tweets: Rate limit exceeded. Try again in 15 minutes.";
//       }
//       return `Error retrieving tweets: ${error}`;
//     }
//   }
// }

// export const tokenTwitterProvider = (
//   config: TwitterActionProviderConfig = {}
// ) => new TokenTwitterProvider(config);
