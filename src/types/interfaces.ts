declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TWITTER_API_KEY: string;
      TWITTER_API_SECRET: string;
      TWITTER_ACCESS_TOKEN: string;
      TWITTER_ACCESS_TOKEN_SECRET: string;
      SCHEDULE_ENABLED: string;
      SCHEDULE_INTERVAL_MINUTES?: string;
      SCHEDULE_TIMEZONE?: string;
      MAX_DAILY_RUNS?: string;
      START_HOUR?: string;
      END_HOUR?: string;
    }
  }
}

export interface DexscreenerLink {
  type: string;
  label: string;
  url: string;
}

export interface DexscreenerToken {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount: number;
  totalAmount: number;
  openGraph: string;
  icon: string;
  header: string;
  description: string;
  links: DexscreenerLink[];
}

export interface TokenLink {
  type: string;
  url: string;
}

export interface TokenPairData {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume: {
    h24?: number;
    h6?: number;
    h1?: number;
    m5?: number;
  };
  priceChange: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
}

export interface Token {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  openGraph?: string;
  description: string;
  links?: Array<TokenLink>;
  totalAmount?: number;
  // Added liquidity pool data
  price: number;
  volume24h: number;
  liquidity: number;
  priceChange24h: number;
  txCount24h: number;
  marketCap: number; // Added market cap
}

export interface Tweet {
  id: string;
  text: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

export interface SentimentAnalysis {
  sentiment: string;
  confidence: number;
  arguments: string[];
}

export interface TokenReport {
  token: Token;
  timestamp: Date;
  overallSentiment: string;
  confidenceScore: number;
  supportingArguments: string[];
  analyzedTweets: number;
}

export interface AnalyzerConfig {
  apiKey: string;
  threshold?: number;
  maxTweets?: number;
}

export interface TweetData {
  text: string;
  id: string;
  createdAt: Date;
}

export interface AnalysisResult {
  sentiment: SentimentAnalysis;
  token: Token;
  timestamp: Date;
}
