"use client";

import React, { useState, useRef, useEffect } from "react";
import { PaperAirplaneIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Logo from "@/components/Logo";

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
    <main className="flex flex-col h-screen bg-black font-mono">
      {/* Header with Logo */}
      <div className="border-b border-green-500/20 bg-black p-4">
        <div className="max-w-4xl mx-auto">
          <Logo />
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/20 scrollbar-track-black">
        <div className="max-w-4xl mx-auto pt-8 pb-24">
          {messages.length === 0 && !currentStreamingMessage && (
            <div className="text-center text-green-500 mt-8 animate-pulse">
              <h1 className="text-2xl font-bold mb-2 font-mono">
                > TokenPulse Terminal v1.0.0_
              </h1>
              <p className="text-lg text-green-400/80">
                {">> Ready for token analysis. Awaiting input..."}
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`px-4 py-4 ${
                message.role === "assistant" ? "bg-black" : "bg-black"
              }`}
            >
              <div className="max-w-4xl mx-auto flex space-x-4">
                <div className="flex-none pt-1">
                  <span className={`font-bold ${
                    message.role === "assistant"
                      ? "text-green-500"
                      : "text-blue-500"
                  }`}>
                    {message.role === "assistant" ? "AI>" : "USER>"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className={`whitespace-pre-wrap ${
                    message.role === "assistant" 
                      ? "text-green-400/90" 
                      : "text-blue-400/90"
                  }`}>
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {currentStreamingMessage && (
            <div className="px-4 py-4 bg-black">
              <div className="max-w-4xl mx-auto flex space-x-4">
                <div className="flex-none pt-1">
                  <span className="text-green-500 font-bold">AI></span>
                </div>
                <div className="flex-1">
                  <p className="text-green-400/90 whitespace-pre-wrap">
                    {currentStreamingMessage}
                    <span className="animate-pulse">_</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {loading && !currentStreamingMessage && (
            <div className="px-4 py-4 bg-black">
              <div className="max-w-4xl mx-auto flex space-x-4">
                <div className="flex-none pt-1">
                  <span className="text-green-500 font-bold">SYSTEM></span>
                </div>
                <div className="flex-1">
                  <p className="text-green-400/90 animate-pulse">
                    Processing request...
                  </p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-6 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center text-green-500 bg-black/50 border border-green-500/20 rounded-lg focus-within:border-green-500/50">
              <span className="pl-4 font-bold">{">"}</span>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                rows={1}
                className="w-full pr-12 pl-2 py-3 bg-transparent border-0 focus:ring-0 resize-none text-green-400 placeholder-green-700 font-mono"
                style={{ maxHeight: "200px" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 bottom-2.5 p-1.5 rounded-lg text-green-500 hover:text-green-400 hover:bg-green-500/10 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
