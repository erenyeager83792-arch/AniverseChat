import express from 'express';
import serverless from 'serverless-http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize storage for serverless environment
class MemStorage {
  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
  }

  async createChatSession({ title }) {
    const id = crypto.randomUUID();
    const session = { id, title, createdAt: new Date().toISOString() };
    this.sessions.set(id, session);
    return session;
  }

  async getAllChatSessions() {
    return Array.from(this.sessions.values()).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  async getChatSession(id) {
    return this.sessions.get(id) || null;
  }

  async getMessagesBySessionId(sessionId) {
    return Array.from(this.messages.values()).filter(msg => msg.sessionId === sessionId);
  }

  async createMessage(sessionId, message) {
    const id = crypto.randomUUID();
    const msg = { id, sessionId, ...message, createdAt: new Date().toISOString() };
    this.messages.set(id, msg);
    return msg;
  }
}

const storage = new MemStorage();
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.post("/api/chat/sessions", async (req, res) => {
  try {
    const session = await storage.createChatSession({ title: "New Chat" });
    res.json(session);
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

app.get("/api/chat/sessions", async (req, res) => {
  try {
    const sessions = await storage.getAllChatSessions();
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await storage.getMessagesBySessionId(sessionId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    // Check if session exists
    const session = await storage.getChatSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Save user message
    const userMessage = await storage.createMessage(sessionId, {
      role: "user",
      content: content
    });

    // Get conversation history
    const messages = await storage.getMessagesBySessionId(sessionId);
    const conversationHistory = messages
      .filter(msg => msg.role === "user" || msg.role === "assistant")
      .map(msg => ({ role: msg.role, content: msg.content }));

    // Call Perplexity API
    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are AniVerse AI, an expert assistant specialized in anime and manga. Provide detailed, accurate, and enthusiastic responses about anime series, manga, characters, plot analysis, recommendations, and industry insights. Use your knowledge to help users discover new content and deepen their understanding of anime and manga culture."
          },
          { role: "user", content: content }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        top_p: 0.9,
        return_related_questions: false,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 0.1
      })
    });

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
    }

    const data = await perplexityResponse.json();
    const aiContent = data.choices?.[0]?.message?.content || "I apologize, but I'm unable to process your request at the moment. Please try again.";

    // Save AI response
    const aiMessage = await storage.createMessage(sessionId, {
      role: "assistant",
      content: aiContent
    });

    res.json({
      userMessage,
      aiMessage,
      success: true
    });

  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ 
      error: "Failed to process message",
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasPerplexityKey: !!PERPLEXITY_API_KEY
  });
});

export const handler = serverless(app);