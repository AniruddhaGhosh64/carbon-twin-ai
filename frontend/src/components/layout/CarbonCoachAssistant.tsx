"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Send, X, Bot, User, Sparkles, Loader2, Trash2 } from "lucide-react";
import { ChatMessage, ChatResponse } from "@/types/carbon";
import api from "@/lib/api/client";
import logger from "@/lib/logger";

export default function CarbonCoachAssistant() {
  const { data: session } = useSession();
  const userId = session?.user?.id || session?.user?.email || "default_user";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to the bottom of the chat list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Escape key close handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages, isSending]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue("");
    }

    const newUserMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsSending(true);
    setErrorText(null);

    try {
      // Map frontend 'model' role to backend 'model' role
      const backendHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const data = await api.post<ChatResponse>("/api/v1/carbontwin/chat", {
        message: text,
        history: backendHistory,
      }, { userId });

      setMessages(prev => [...prev, { role: "model", content: data.response }]);
    } catch (err: unknown) {
      logger.error("Carbon Coach Chat Error", err);
      setErrorText(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSending) {
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setErrorText(null);
  };

  const suggestions = [
    "Why is my score low?",
    "How can I reduce emissions?",
    "What if I stop flying?",
    "Which category hurts me most?",
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        ref={toggleBtnRef}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary shadow-glow shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border border-primary/20 hover:shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
        title="Chat with Carbon Coach"
        aria-label="Toggle Carbon Coach AI Assistant"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-300 rotate-90" />
        ) : (
          <MessageSquare className="w-6 h-6 transition-transform duration-300 hover:rotate-12" />
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div 
          role="dialog"
          aria-modal="false"
          aria-label="Carbon Coach Chat Assistant"
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-glass rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-outline-variant/30 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-glow"
        >
          {/* Header */}
          <div className="bg-surface-container-high px-4 py-3 flex items-center justify-between border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-body-sm font-semibold text-on-surface flex items-center gap-1.5">
                  Carbon Coach AI
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </h3>
                <span className="text-[10px] text-primary flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                  Active Context
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface-container-highest/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                  title="Clear Chat"
                  aria-label="Clear Chat History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-lg hover:bg-surface-container-highest/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                aria-label="Close Chat Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest/30">
            {messages.length === 0 ? (
              <div className="space-y-4 py-4 animate-in fade-in duration-300">
                <div className="bg-surface-container-low/60 rounded-xl p-4 border border-outline-variant/20">
                  <p className="text-body-sm text-on-surface mb-2 font-medium">
                    Hello! I&apos;m your Carbon Coach. 🌿
                  </p>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    I have access to your active footprint calculation, simulator projections, adopted eco missions, and twin options. Ask me anything to discover how to maximize your carbon reductions and financial savings!
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-label-caps text-on-surface-variant font-semibold">
                    Suggested Questions
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(suggestion)}
                        className="w-full text-left bg-surface-container-high/40 hover:bg-surface-container-high/90 text-on-surface border border-outline-variant/10 hover:border-primary/30 rounded-xl px-3 py-2.5 text-body-sm transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                        aria-label={`Ask: ${suggestion}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2 animate-in fade-in duration-200 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role !== "user" && (
                    <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0 border border-outline-variant/20">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl text-body-sm leading-relaxed max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary-container text-on-primary-container rounded-tr-none"
                        : "bg-surface-container-high text-on-surface rounded-tl-none border border-outline-variant/20 shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-primary-container shrink-0 border border-primary/20">
                      <User className="w-4 h-4 text-on-primary-container" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading State Indicator */}
            {isSending && (
              <div className="flex gap-2 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0 border border-outline-variant/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-surface-container-high text-on-surface p-3 rounded-2xl rounded-tl-none border border-outline-variant/20 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-body-sm text-on-surface-variant">Thinking...</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorText && (
              <div className="bg-error-container/40 text-on-error-container p-3 rounded-xl border border-error-container text-body-sm animate-in shake duration-300">
                {errorText}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Panel Footer */}
          <div className="p-3 bg-surface-container-high/50 border-t border-outline-variant/20 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Ask about your emissions, score, etc..."
              aria-label="Ask Carbon Coach AI Assistant"
              className="w-full bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 text-body-sm transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={isSending || !inputValue.trim()}
              aria-label="Send message"
              className="absolute right-6 top-1/2 -translate-y-1/2 text-primary hover:text-on-primary hover:bg-primary p-2 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-primary transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
