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

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Add message to conversation history
    const newMessage = new HumanMessage(message);
    conversationHistory.push(newMessage);

    // Create a response stream
    const stream = await agent.stream(
      { messages: conversationHistory },
      agentConfig
    );

    // Stream the response word by word
    for await (const chunk of stream) {
      if ("tools" in chunk) {
        const content = chunk.tools.messages[0].content;
        const words = content.split(" ");

        for (const word of words) {
          res.write(`data: ${JSON.stringify({ word: word + " " })}\n\n`);
          // Small delay between words for natural feeling
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    // Send end message
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Internal server error" })}\n\n`
    );
    res.end();
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
