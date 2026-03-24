"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Simulate realistic typing time (fast typer: ~80ms per word + base delay)
const calculateTypingDelay = (text: string) => {
  const words = text.split(" ").length;
  const baseDelay = 800; // Minimum "thinking" time
  const perWordDelay = 80; // ~75 WPM typing speed
  const variance = Math.random() * 600; // Random 0-600ms variance
  return baseDelay + words * perWordDelay + variance;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (data.reply) {
        // Show typing indicator for realistic duration based on message length
        setIsTyping(true);
        const typingDelay = calculateTypingDelay(data.reply);

        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply },
          ]);
        }, typingDelay);
      }
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "ay, tuve un problemita técnico. intenta de nuevo!",
        },
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-tvc-void to-tvc-deep flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-admin-border bg-admin-surface/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-tvc-turquoise rounded-full flex items-center justify-center">
            <span className="font-display text-tvc-void font-bold text-xl">
              V
            </span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              Valentina
            </h1>
            <p className="text-sm text-white/60">Tiny Village Cartagena</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-white/60">Online</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && !loading && !isTyping && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-tvc-turquoise/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🌴</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">
                hola! soy Valentina 👋
              </h2>
              <p className="text-white/60 max-w-md mx-auto mb-8">
                trabajo en Tiny Village Cartagena. pregúntame lo que quieras
                sobre el resort, la isla, o cómo llegar!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Tell me about TVC",
                  "What are the villa types?",
                  "Best restaurants in Cartagena?",
                  "How do I get there?",
                  "Village Takeover info",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="px-4 py-2 bg-admin-surface border border-admin-border rounded-full text-sm text-white/80 hover:border-tvc-turquoise hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-tvc-turquoise text-tvc-void rounded-br-sm"
                    : "bg-admin-surface border border-admin-border text-white rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Typing indicator - shows while waiting for response or "typing" */}
          {(loading || isTyping) && (
            <div className="flex justify-start">
              <div className="bg-admin-surface border border-admin-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">Valentina</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-tvc-turquoise rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-tvc-turquoise rounded-full animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="w-2 h-2 bg-tvc-turquoise rounded-full animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-admin-border bg-admin-surface/50 backdrop-blur">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="escríbele a Valentina..."
            className="flex-1 bg-admin-surface border border-admin-border rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-tvc-turquoise focus:outline-none"
            disabled={loading || isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={loading || isTyping || !input.trim()}
            className="px-6 py-3 bg-tvc-turquoise text-tvc-void font-semibold rounded-xl hover:bg-tvc-turquoise/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
