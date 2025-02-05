import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeAgent } from "./agent";
import { HumanMessage } from "@langchain/core/messages";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize agent and conversation memory
let agent: any = null;
let agentConfig: any = null;
let conversationHistory: HumanMessage[] = [];

async function setupAgent() {
  try {
    const result = await initializeAgent();
    agent = result.agent;
    agentConfig = result.config;
    console.log("Agent initialized successfully");
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    process.exit(1);
  }
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    if (!agent) {
      return res.status(503).json({
        error: "Agent not initialized",
      });
    }

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    // Add message to conversation history
    const newMessage = new HumanMessage(message);
    conversationHistory.push(newMessage);

    // Create a response stream with full conversation history
    const stream = await agent.stream(
      { messages: conversationHistory },
      agentConfig
    );

    let fullResponse = "";

    // Collect all chunks
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        fullResponse += chunk.agent.messages[0].content + "\n";
      } else if ("tools" in chunk) {
        fullResponse += chunk.tools.messages[0].content + "\n";
      }
    }

    // Add assistant's response to conversation history
    conversationHistory.push(new HumanMessage(fullResponse.trim()));

    // Limit conversation history to last N messages (e.g., 10)
    const MAX_HISTORY = 10;
    if (conversationHistory.length > MAX_HISTORY * 2) {
      // *2 because each exchange has 2 messages
      conversationHistory = conversationHistory.slice(-MAX_HISTORY * 2);
    }

    res.json({
      response: fullResponse.trim(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Clear conversation history endpoint
app.post("/api/chat/clear", (_, res) => {
  conversationHistory = [];
  res.json({
    status: "ok",
    message: "Conversation history cleared",
  });
});

// Health check endpoint
app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    agentReady: !!agent,
    conversationLength: conversationHistory.length,
  });
});

// Start server
async function startServer() {
  await setupAgent();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);

// Handle shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  process.exit(0);
});
