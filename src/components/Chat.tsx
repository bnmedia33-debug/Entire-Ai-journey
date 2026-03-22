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
      const baseUrl = window.location.origin;
      const res = await fetch(`${baseUrl}/api/chat/history`, {
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
      const baseUrl = window.location.origin;
      // 1. Prepare chat (Save user message and get RAG context)
      const prepareRes = await fetch(`${baseUrl}/api/chat/prepare`, {
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
      await fetch(`${baseUrl}/api/chat/save`, {
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
    <div className="flex h-screen bg-[#fafafa] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-zinc-100 flex flex-col relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              AI Tutor
            </h2>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4 ml-1">Subjects</p>
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                  selectedSubject === sub.id
                    ? `${sub.bg} ${sub.color} font-semibold shadow-sm`
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <sub.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${selectedSubject === sub.id ? sub.color : "text-zinc-400"}`} />
                <span className="text-sm">{sub.id}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-50">
          <div className="bg-zinc-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-600 shadow-sm">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-zinc-900 truncate">{username}</p>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Student</p>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 flex items-center px-10 justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Active Session</span>
            <div className="h-4 w-[1px] bg-zinc-200 mx-2" />
            <span className="text-sm font-semibold text-zinc-900">{selectedSubject}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Gemini 3.1 Flash
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-zinc-200/50 flex items-center justify-center border border-zinc-100">
                    <Bot className="w-10 h-10 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">How can I help you today?</h3>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                      I'm your AI Academic Tutor. Ask me anything about {selectedSubject} and I'll help you understand it step-by-step.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-md w-full mt-8">
                    {["Explain the basics", "Help me with a problem", "Summarize key concepts", "Quiz me"].map((hint) => (
                      <button 
                        key={hint}
                        onClick={() => setInput(hint)}
                        className="p-4 bg-white border border-zinc-100 rounded-2xl text-xs font-semibold text-zinc-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] flex gap-5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                        msg.role === "user" ? "bg-white border border-zinc-100 text-zinc-400" : "bg-indigo-600 text-white shadow-indigo-100"
                      }`}>
                        {msg.role === "user" ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div className={`p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] ${
                        msg.role === "user" 
                          ? "bg-zinc-900 text-white rounded-tr-none" 
                          : "bg-white border border-zinc-100 text-zinc-800 rounded-tl-none"
                      }`}>
                        <div className={`prose prose-sm max-w-none ${msg.role === "user" ? "prose-invert" : "prose-zinc"}`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        <div className={`flex items-center gap-2 mt-4 opacity-40 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white border border-zinc-100 p-6 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tutor is thinking...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        <div className="p-10 bg-gradient-to-t from-white via-white to-transparent pt-20 sticky bottom-0 z-20">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[28px] opacity-0 group-focus-within:opacity-10 transition-opacity blur-lg" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${selectedSubject}...`}
              className="w-full pl-8 pr-20 py-5 bg-white border border-zinc-200 rounded-[24px] shadow-xl shadow-zinc-100/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm relative z-10"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-30 z-20 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="max-w-4xl mx-auto flex items-center justify-between mt-6 px-4">
            <p className="text-[9px] text-zinc-400 uppercase tracking-[0.3em] font-bold">
              AI Academic Tutoring System
            </p>
            <div className="flex gap-4">
              <span className="text-[9px] text-zinc-300 uppercase tracking-widest font-bold">Privacy</span>
              <span className="text-[9px] text-zinc-300 uppercase tracking-widest font-bold">Terms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
