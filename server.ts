import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "ai-tutor-secret-key";

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Initialize Database
let db: Database.Database;
try {
  db = new Database("tutor.db");
  console.log("Database initialized successfully");
} catch (err) {
  console.error("Failed to initialize database:", err);
  process.exit(1);
}

// Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subject TEXT,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT,
    topic TEXT,
    content TEXT
  );
`);

// Seed Knowledge Base (Basic RAG Data)
const seedData = [
  { subject: "Programming", topic: "Variables", content: "A variable is a container for storing data values. In Python, you create a variable the moment you first assign a value to it." },
  { subject: "Programming", topic: "Loops", content: "A for loop is used for iterating over a sequence (that is either a list, a tuple, a dictionary, a set, or a string)." },
  { subject: "Maths", topic: "Algebra", content: "Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols. In its simplest form, it involves solving for unknown variables like x." },
  { subject: "Maths", topic: "Calculus", content: "Calculus is the mathematical study of continuous change, in the same way that geometry is the study of shape and algebra is the study of generalizations of arithmetic operations." },
  { subject: "Science", topic: "Photosynthesis", content: "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll pigments." },
  { subject: "Science", topic: "Gravity", content: "Gravity is a fundamental interaction which causes mutual attraction between all things with mass or energy." }
];

const checkSeed = db.prepare("SELECT COUNT(*) as count FROM knowledge_base").get() as { count: number };
if (checkSeed.count === 0) {
  const insert = db.prepare("INSERT INTO knowledge_base (subject, topic, content) VALUES (?, ?, ?)");
  seedData.forEach(item => insert.run(item.subject, item.topic, item.content));
}

app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---
const apiRouter = express.Router();

// Health Check
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Registration
apiRouter.post("/auth/register", async (req, res) => {
  const { username, password, email } = req.body;
  console.log(`Register attempt: ${username}`);
  try {
    if (!username || !password || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const info = db.prepare("INSERT INTO users (username, password, email) VALUES (?, ?, ?)").run(username, hashedPassword, email);
    res.status(201).json({ message: "User registered successfully", userId: info.lastInsertRowid });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Login
apiRouter.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt: ${username}`);
  try {
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Get Chat History
apiRouter.get("/chat/history", authenticateToken, (req: any, res) => {
  try {
    const history = db.prepare("SELECT * FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC").all(req.user.id);
    res.json(history);
  } catch (error: any) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Prepare Chat (Save user message and get RAG context)
apiRouter.post("/chat/prepare", authenticateToken, (req: any, res) => {
  const { message, subject } = req.body;
  const userId = req.user.id;

  try {
    // 1. Save user message
    db.prepare("INSERT INTO chat_history (user_id, subject, role, content) VALUES (?, ?, ?, ?)").run(userId, subject, "user", message);

    // 2. Basic RAG: Search knowledge base
    const relevantDocs = db.prepare("SELECT content FROM knowledge_base WHERE subject = ? AND (topic LIKE ? OR content LIKE ?) LIMIT 2")
      .all(subject, `%${message}%`, `%${message}%`) as { content: string }[];
    
    const context = relevantDocs.map(doc => doc.content).join("\n");

    res.json({ context });
  } catch (error: any) {
    console.error("Prepare Chat Error:", error);
    res.status(500).json({ error: "Failed to prepare chat" });
  }
});

// Save AI Response
apiRouter.post("/chat/save", authenticateToken, (req: any, res) => {
  const { response, subject } = req.body;
  const userId = req.user.id;

  try {
    db.prepare("INSERT INTO chat_history (user_id, subject, role, content) VALUES (?, ?, ?, ?)").run(userId, subject, "assistant", response);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Save Chat Error:", error);
    res.status(500).json({ error: "Failed to save chat" });
  }
});

// Mount API router
app.use("/api", apiRouter);

// Handle 404 for API routes specifically
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log("Registered API routes:");
    apiRouter.stack.forEach((r) => {
      if (r.route && r.route.path) {
        console.log(`${Object.keys(r.route.methods).join(",").toUpperCase()} /api${r.route.path}`);
      }
    });
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
