# TokenPulse

An AI-driven sentiment analysis tool that combines real-time on-chain metrics with social media sentiment to generate actionable market insights for cryptocurrency tokens.

## Overview

TokenPulse leverages multiple data sources and cutting-edge AI technologies to help market analysts and investors quickly gauge whether a token's current buzz is bullish or bearish, supported by relevant arguments extracted from social media chatter.

## Features

- Real-time token boost data from Dexscreener
- Social sentiment analysis from Twitter
- AI-powered sentiment classification using Coinbase's AgentKit and OpenAI
- Aggregated sentiment reports with supporting arguments

## How It Works

1. **Token Data Retrieval**: Fetches active token boosts from Dexscreener API
2. **Social Sentiment Extraction**: Queries Twitter for relevant token discussions
3. **AI Sentiment Analysis**: Processes tweets through AgentKit + OpenAI
4. **Signal Aggregation**: Compiles sentiment data into actionable insights

## Requirements

- Node.js 18+
- [OpenAI API Key](https://platform.openai.com/docs/quickstart#create-and-export-an-api-key)
- [Twitter (X) API Keys](https://developer.x.com/en/portal/dashboard)
- [CDP API Key](https://portal.cdp.coinbase.com/access/api)
- [Dexscreener API Access](https://docs.dexscreener.com/api/reference)

### API Setup Instructions

#### Twitter Application Setup

1. Visit the Twitter (X) [Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Navigate to your project and application
3. Edit "User authentication settings"
4. Set "App permissions" to "Read and write and Direct message"
5. Set "Type of App" to "Web App, Automated app or Bot"
6. Configure "App info" urls and save
7. Generate required keys and tokens

### Environment Setup

Before running the application, ensure you have Node.js 18+ installed:

```bash
node --version
npm --version
```

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following variables:

```
OPENAI_API_KEY=your_openai_key
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
CDP_API_KEY_NAME=your_cdp_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key
SCHEDULE_ENABLED=true or false
SCHEDULE_INTERVAL_MINUTES=optional
SCHEDULE_TIMEZONE=optional
MAX_DAILY_RUNS=optional
START_HOUR=optional
END_HOUR=optional
# API Configuration
DEXSCREENER_REQUEST_INTERVAL=1000
DEXSCREENER_MAX_RETRIES=3
DEXSCREENER_TIMEOUT=5000
# Token Filtering Thresholds
MIN_LIQUIDITY_USD=50000
MIN_VOLUME_24H=10000
MIN_TXNS_24H=50
MIN_MARKET_CAP=1000000
MAX_MARKET_CAP=100000000
# Scoring Weights (must sum to 1)
WEIGHT_LIQUIDITY=0.25
WEIGHT_VOLUME=0.25
WEIGHT_TRANSACTIONS=0.20
WEIGHT_PRICE_CHANGE=0.15
WEIGHT_MARKET_CAP=0.15
```

## Usage

Start the application:

```bash
npm start
```

## License

This project is licensed under the GPL-3.0 License. See the LICENSE file for details.
