import { AgentKit, twitterActionProvider } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SentimentAnalysis, Tweet } from "../types/interfaces";

export class SentimentAnalyzer {
  private agent: any;
  private config: any;
  private static instance: SentimentAnalyzer;

  private constructor() {}

  static async getInstance(): Promise<SentimentAnalyzer> {
    if (!SentimentAnalyzer.instance) {
      SentimentAnalyzer.instance = new SentimentAnalyzer();
      await SentimentAnalyzer.instance.initialize();
    }
    return SentimentAnalyzer.instance;
  }

  private async initialize() {
    const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
    const agentkit = await AgentKit.from({
      cdpApiKeyName: process.env.CDP_API_KEY_NAME,
      cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      ),
      actionProviders: [twitterActionProvider()],
    });

    const tools = await getLangChainTools(agentkit);
    this.config = {
      configurable: {
        thread_id: "TokenPulse Sentiment Analysis",
      },
    };

    this.agent = createReactAgent({
      llm,
      tools,
      messageModifier: `
                You are a cryptocurrency sentiment analysis expert.
                Analyze multiple tweets and provide an overall sentiment analysis.
                Format your response exactly as:

                Overall Sentiment: [bullish/bearish]
                Confidence: [0-1]
                Key Arguments:
                - [key point 1]
                - [key point 2]
                
                Individual Tweet Analysis:
                [Tweet 1]:
                - Sentiment: [bullish/bearish]
                - Confidence: [0-1]
                - Key Points: [brief analysis]
                
                [Tweet 2]:
                ...
            `,
    });
  }

  async analyzeTweets(tweets: Tweet[]): Promise<SentimentAnalysis> {
    try {
      // const tweetAnalysisPrompt = tweets.map((tweet, index) =>
      //     `Tweet ${index + 1} (${tweet.engagement.likes} likes, ${tweet.engagement.retweets} retweets):
      //     "${tweet.text}"`
      // ).join('\n\n');

      const tweetAnalysisPrompt = `Tweet 1 (120 likes, 30 retweets):
"𝗕𝗜𝗚 𝗪𝗜𝗡: 𝟯𝟬𝘅 | 🍌 🍌 🍌
E14jecSeL6iiQ…tps://t.co/3kZKfpwfT2 https://t.co/hfsETqH6LV"

Tweet 2 (95 likes, 25 retweets):
"LFG LADS GET THIS TO 25M MC
E14jecSeL6iiQk5obt…orangie @orangienudes https://t.co/VMYKfLGnyz"

Tweet 3 (80 likes, 20 retweets):
"6.7x up from my call on $QUEEN
called in my pr…MYMhKXZpDYSBtEx8Bpump https://t.co/aQhDrDurC2"

Tweet 4 (110 likes, 40 retweets):
"What's good, crypto fam!
📅 Report Time: 2025… $369K is modest for… https://t.co/qbUR0tpF7v"

Tweet 5 (100 likes, 35 retweets):
"Still rolling in profits on $QUEEN 
Exceeds $1…tps://t.co/o0bVBcU3Lr https://t.co/BL9ZPwTK7G"

Tweet 6 (70 likes, 15 retweets):
"When the people sleep because the market so dr…SLEEP all day long 😭 https://t.co/ODBc3lBJC9"

Tweet 7 (60 likes, 10 retweets):
"A $AVB whale just bought $7.9K of $Queen at $8.0M MC 🐳. https://t.co/3l9mYcbbmm"

Tweet 8 (50 likes, 8 retweets):
"gm chat @fluxways fuck you
E14jecSeL6iiQk5obt8…THIS TO THE MOON LADS https://t.co/88zJnPdn4M"

Tweet 9 (40 likes, 5 retweets):
"RT @Unveil_Majesty: CA: E14jecSeL6iiQk5obt8vPzpMYMhKXZpDYSBtEx8Bpump $QUEEN"
`;

      const messages = [
        new SystemMessage(
          "You are a cryptocurrency sentiment analysis expert. Analyze multiple tweets and provide both overall and individual sentiment analysis."
        ),
        new HumanMessage(`
                    Analyze these tweets about a cryptocurrency token:
                    
                    ${tweetAnalysisPrompt}
                    
                    Provide:
                    1. Overall sentiment analysis (bullish/bearish)
                    2. Confidence level (0-1)
                    3. Key supporting arguments
                    4. Brief analysis of each individual tweet
                `),
      ];

      const stream = await this.agent.stream({ messages }, this.config);
      let content = "";

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          content = chunk.agent.messages[0].content;
        }
      }

      return this.parseResponse(content);
    } catch (error) {
      console.error("Error analyzing tweets:", error);
      throw error;
    }
  }

  private parseResponse(content: string): SentimentAnalysis {
    // Extract overall sentiment
    const sentimentMatch = content.match(
      /Overall Sentiment:\s*(bullish|bearish)/i
    );
    const sentiment = sentimentMatch
      ? (sentimentMatch[1].toLowerCase() as "bullish" | "bearish")
      : "bearish";

    // Extract overall confidence
    const confidenceMatch = content.match(/Confidence:\s*(0\.\d+|1\.0|1)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

    // Extract key arguments
    const argumentsSection =
      content
        .split("Key Arguments:")[1]
        ?.split("Individual Tweet Analysis:")[0] || "";
    const supportingArgs = argumentsSection
      .split("\n")
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.trim().replace(/^-\s*/, ""))
      .filter((arg) => arg.length > 0);

    return {
      sentiment,
      confidence,
      arguments:
        supportingArgs.length > 0
          ? supportingArgs
          : ["No specific arguments provided"],
    };
  }
}
