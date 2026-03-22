import React, { useState, useEffect } from "react";
import Auth from "./components/Auth";
import Chat from "./components/Chat";

export default function App() {
  const getSafeStorage = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage access failed:", e);
      return null;
    }
  };

  const [token, setToken] = useState<string | null>(getSafeStorage("token"));
  const [username, setUsername] = useState<string | null>(getSafeStorage("username"));

  const handleAuth = (newToken: string, newUsername: string) => {
    setToken(newToken);
    setUsername(newUsername);
    try {
      localStorage.setItem("token", newToken);
      localStorage.setItem("username", newUsername);
    } catch (e) {
      console.warn("localStorage set failed:", e);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
    } catch (e) {
      console.warn("localStorage remove failed:", e);
    }
  };

  if (!token || !username) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Chat token={token} username={username} onLogout={handleLogout} />
    </div>
  );
}
