import React, { useState } from "react";
import { BookOpen, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { auth, googleProvider } from "../../firebase";
import { signInWithPopup } from "firebase/auth";

export default function Auth() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[400px] relative"
      >
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 p-10 backdrop-blur-sm">
          <div className="flex justify-center mb-10">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight mb-2">
              AI Academic Tutor
            </h1>
            <p className="text-zinc-500 text-sm">
              Sign in to start your academic journey with AI
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl text-xs font-medium mb-8 text-center bg-red-50 text-red-700 border border-red-100"
            >
              {error}
            </motion.div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border border-zinc-200 text-zinc-700 font-semibold rounded-2xl hover:bg-zinc-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-8 pt-8 border-t border-zinc-50 text-center">
            <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-widest">
              Secure Academic Access
            </p>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-zinc-400 mt-8 uppercase tracking-[0.2em] font-semibold">
          AI Academic Tutor v1.0
        </p>
      </motion.div>
    </div>
  );
}
