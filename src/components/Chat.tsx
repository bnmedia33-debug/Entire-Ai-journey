import React, { useState, useEffect, useRef } from "react";
import { Send, BookOpen, Code, FlaskConical, LogOut, User as UserIcon, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  subject: string;
  timestamp: string;
}

interface ChatProps {
  token: string;
  username: string;
  onLogout: () => void;
}

const subjects = [
  { id: "Programming", icon: Code, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "Maths", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "Science", icon: FlaskConical, color: "text-purple-600", bg: "bg-purple-50" },
];

export default function Chat({ token, username, onLogout }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Programming");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/chat/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setLoading(true);

    // Optimistic update
    const tempId = Date.now();
    setMessages(prev => [...prev, { 
      id: tempId, 
      role: "user", 
      content: userMessage, 
      subject: selectedSubject,
      timestamp: new Date().toISOString() 
    }]);

    try {
      // 1. Prepare chat (Save user message and get RAG context)
      const prepareRes = await fetch("/api/chat/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage, subject: selectedSubject }),
      });

      const { context } = await prepareRes.json();

      // 2. Call Gemini API from Frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are an expert AI Tutor. 
            Subject: ${selectedSubject}
            Context from Textbook: ${context || "No specific context found."}
            
            Student Question: ${userMessage}
            
            Please provide a clear, step-by-step explanation. If the context is relevant, use it. If not, use your general knowledge but stay focused on the subject.` }]
          }
        ],
        config: {
          temperature: 0.7,
        }
      });

      const aiResponse = response.text || "I'm sorry, I couldn't generate a response.";

      // 3. Save AI response to backend
      await fetch("/api/chat/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ response: aiResponse, subject: selectedSubject }),
      });

      setMessages(prev => [...prev, { 
        id: tempId + 1, 
        role: "assistant", 
        content: aiResponse, 
        subject: selectedSubject,
        timestamp: new Date().toISOString() 
      }]);
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-bottom border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-600" />
            AI Tutor
          </h2>
        </div>

        <div className="flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 px-2">Subjects</p>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubject(sub.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedSubject === sub.id
                  ? `${sub.bg} ${sub.color} font-semibold shadow-sm`
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <sub.icon className="w-5 h-5" />
              {sub.id}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-zinc-900 truncate">{username}</p>
              <p className="text-xs text-zinc-500">Student</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center px-8 justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-500">Currently Studying:</span>
            <span className="text-sm font-bold text-zinc-900">{selectedSubject}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Bot className="w-16 h-16 text-zinc-300" />
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">Start a conversation</h3>
                  <p className="text-sm text-zinc-500 max-w-xs">Ask your AI Tutor anything about {selectedSubject}.</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === "user" ? "bg-zinc-200 text-zinc-600" : "bg-indigo-600 text-white"
                    }`}>
                      {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.role === "user" 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none"
                    }`}>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <p className={`text-[10px] mt-2 opacity-50 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-zinc-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white border-t border-zinc-200">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask a question about ${selectedSubject}...`}
              className="w-full pl-6 pr-16 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-400 mt-4 uppercase tracking-widest font-medium">
            AI-Powered Academic Tutoring System
          </p>
        </div>
      </div>
    </div>
  );
}
