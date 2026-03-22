import React, { useState, useEffect } from "react";
import { User, Lock, Mail, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface AuthProps {
  onAuth: (token: string, username: string) => void;
}

export default function Auth({ onAuth }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "up" | "down">("checking");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/health`);
        if (res.ok) {
          setApiStatus("up");
        } else {
          setApiStatus("down");
        }
      } catch (err) {
        setApiStatus("down");
      }
    };
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const baseUrl = window.location.origin;
    const endpoint = isLogin ? `${baseUrl}/api/auth/login` : `${baseUrl}/api/auth/register`;
    const body = isLogin ? { username, password } : { username, password, email };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Something went wrong");
        }
        if (isLogin) {
          onAuth(data.token, data.username);
        } else {
          setIsLogin(true);
          setError("Registration successful! Please login.");
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text);
        let errorMessage = `Server returned an unexpected response (Status: ${res.status}).`;
        if (res.status === 404) {
          errorMessage += " The requested API endpoint was not found. Please ensure the backend routes are correctly configured.";
        }
        if (text.length < 200) {
          errorMessage += ` Response: ${text}`;
        }
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-zinc-200"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-zinc-500">
            {isLogin ? "Login to access your AI Tutor" : "Join our learning community today"}
          </p>
          {apiStatus === "down" && (
            <p className="mt-2 text-xs text-red-500 font-semibold animate-pulse">
              âš ï¸ Backend API appears to be offline.
            </p>
          )}
        </div>

        {error && (
          <div className={`p-3 rounded-lg text-sm mb-6 ${error.includes("successful") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Register"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-600 hover:underline text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
