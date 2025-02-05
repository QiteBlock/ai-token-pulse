import { TwitterApi } from 'twitter-api-v2';
import { Tweet, Token } from '../types/interfaces';

export class TwitterService {
    private client: TwitterApi;
    private lastSearchTime: number = 0;
    private dailyTweetCount: number = 0;
    private lastTweetCountReset: number = 0;
    private readonly FIFTEEN_MINUTES = 15 * 60 * 1000;
    private readonly TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    private readonly MAX_DAILY_TWEETS = 17;

    constructor() {
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY!,
            appSecret: process.env.TWITTER_API_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
        });
    }

    private async checkSearchRateLimit() {
        const now = Date.now();
        const timeElapsed = now - this.lastSearchTime;
        
        if (timeElapsed < this.FIFTEEN_MINUTES) {
            const waitTime = this.FIFTEEN_MINUTES - timeElapsed;
            console.log(`Rate limit: Waiting ${waitTime/1000} seconds before next search`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastSearchTime = now;
    }

    private async checkTweetRateLimit() {
        const now = Date.now();
        
        // Reset counter if 24 hours have passed
        if (now - this.lastTweetCountReset >= this.TWENTY_FOUR_HOURS) {
            this.dailyTweetCount = 0;
            this.lastTweetCountReset = now;
        }

        if (this.dailyTweetCount >= this.MAX_DAILY_TWEETS) {
            const waitTime = this.TWENTY_FOUR_HOURS - (now - this.lastTweetCountReset);
            throw new Error(`Daily tweet limit reached. Please wait ${Math.ceil(waitTime/3600000)} hours`);
        }
    }

    async getTweetsByToken(token: Token, limit: number = 10): Promise<Tweet[]> {
        try {
            await this.checkSearchRateLimit();

            const searchQuery = `${token.tokenAddress}`;
            
            const tweets = await this.client.v2.search({
                query: searchQuery,
                max_results: Math.min(limit, 10), // Free tier limitation
                'tweet.fields': ['public_metrics', 'created_at'],
            });

            // Handle the case where no tweets are found
            if (!tweets.data || tweets.data.data.length === 0) {
                return [];
            }

            // Convert the TwitterApi response to our Tweet interface
            return tweets.data.data.map(tweet => ({
                id: tweet.id,
                text: tweet.text,
                engagement: {
                    likes: tweet.public_metrics?.like_count || 0,
                    retweets: tweet.public_metrics?.retweet_count || 0,
                    replies: tweet.public_metrics?.reply_count || 0,
                }
            }));
        } catch (error) {
            if (error instanceof Error && error.message.includes('429')) {
                console.error('Rate limit exceeded. Please try again in 15 minutes.');
            }
            throw error;
        }
    }

    async postReport(report: string): Promise<void> {
        try {
            await this.checkTweetRateLimit();
            
            await this.client.v2.tweet(report);
            this.dailyTweetCount++;
            
        } catch (error) {
            if (error instanceof Error && error.message.includes('429')) {
                console.error('Rate limit exceeded for posting tweets.');
            }
            throw error;
        }
    }
} 