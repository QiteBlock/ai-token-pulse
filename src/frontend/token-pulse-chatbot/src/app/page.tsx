"use client";

import React, { useState, useRef, useEffect } from "react";
import { PaperAirplaneIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface Message {
  id: number;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage.content }),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let streamingContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5).trim();

            if (data === "[DONE]") {
              const botMessage: Message = {
                id: Date.now(),
                content: streamingContent,
                role: "assistant",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, botMessage]);
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.word) {
                streamingContent += parsed.word;
                setCurrentStreamingMessage(streamingContent);
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        content: "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setCurrentStreamingMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto pt-8 pb-24">
          {messages.length === 0 && !currentStreamingMessage && (
            <div className="text-center text-gray-500 mt-8">
              <h1 className="text-2xl font-bold mb-2">
                Welcome to TokenPulse Chat
              </h1>
              <p className="text-lg">
                Ask me anything about cryptocurrency tokens!
              </p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`px-4 py-8 ${
                message.role === "assistant" ? "bg-white" : ""
              }`}
            >
              <div className="max-w-3xl mx-auto flex space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "assistant"
                      ? "bg-green-500 text-white"
                      : "bg-gray-500 text-white"
                  }`}
                >
                  {message.role === "assistant" ? "A" : "U"}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="prose max-w-none whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {currentStreamingMessage && (
            <div className="px-4 py-8 bg-white">
              <div className="max-w-3xl mx-auto flex space-x-4">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  A
                </div>
                <div className="flex-1 space-y-2">
                  <p className="prose max-w-none whitespace-pre-wrap">
                    {currentStreamingMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
          {loading && !currentStreamingMessage && (
            <div className="px-4 py-8 bg-white">
              <div className="max-w-3xl mx-auto flex space-x-4">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  A
                </div>
                <div className="flex-1">
                  <ArrowPathIcon className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 pt-6 pb-8">
        <div className="max-w-3xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message TokenPulse..."
              rows={1}
              className="w-full pr-12 pl-4 py-3 rounded-lg bg-white border border-gray-200 focus:border-gray-300 focus:ring-0 resize-none"
              style={{ maxHeight: "200px" }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 bottom-2.5 p-1.5 rounded-lg text-gray-500 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
