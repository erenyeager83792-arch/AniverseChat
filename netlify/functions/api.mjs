import express from 'express';
import serverless from 'serverless-http';
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';

// Configure Neon for edge environments
neonConfig.webSocketConstructor = global.WebSocket || require('ws');

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Simple storage interface for Netlify deployment
class NetlifyStorage {
  constructor(db) {
    this.db = db;
  }

  async upsertUser(userData) {
    // For Netlify deployment, we'll use a simplified approach
    // In production, you'd want to implement proper database operations
    return userData;
  }

  async getUser(userId) {
    return {
      id: userId,
      email: 'user@example.com',
      firstName: 'User',
      lastName: 'Name',
      profileImageUrl: ''
    };
  }

  async createChatSession({ title, userId }) {
    const id = crypto.randomUUID();
    const session = { 
      id, 
      title: title || "New Chat", 
      userId,
      createdAt: new Date().toISOString() 
    };
    return session;
  }

  async getAllChatSessions(userId) {
    // Return empty for now - implement database queries as needed
    return [];
  }

  async getChatSession(id) {
    return { id, title: "Chat Session", userId: "demo", createdAt: new Date().toISOString() };
  }

  async getMessagesBySessionId(sessionId) {
    return [];
  }

  async createMessage({ sessionId, role, content }) {
    const id = crypto.randomUUID();
    const message = { id, sessionId, role, content, createdAt: new Date().toISOString() };
    return message;
  }

  async deleteChatSession(sessionId) {
    return true;
  }
}

const storage = new NetlifyStorage(db);
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for Netlify
app.use(session({
  secret: process.env.SESSION_SECRET || 'netlify-session-secret-' + Date.now(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth2 Strategy only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.DEPLOY_PRIME_URL || process.env.URL}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        profileImageUrl: profile.photos?.[0]?.value || '',
        accessToken,
        refreshToken
      };

      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });

      return done(null, user);
    } catch (error) {
      return done(error, undefined);
    }
  }));
}

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

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

// Authentication routes - only if Google OAuth is configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );
} else {
  // Fallback routes when OAuth is not configured
  app.get("/api/auth/google", (req, res) => {
    res.status(503).json({ 
      error: "Google OAuth not configured", 
      message: "Google Client ID and Client Secret must be set in environment variables" 
    });
  });

  app.get("/api/auth/google/callback", (req, res) => {
    res.status(503).json({ 
      error: "Google OAuth not configured" 
    });
  });
}

app.get("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
});

app.get('/api/auth/user', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Protected chat routes
app.post("/api/chat/sessions", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionData = { 
      title: req.body.title || "New Chat",
      userId 
    };
    const session = await storage.createChatSession(sessionData);
    res.json(session);
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

app.get("/api/chat/sessions", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await storage.getAllChatSessions(userId);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

app.get("/api/chat/sessions/:sessionId/messages", isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const session = await storage.getChatSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const messages = await storage.getMessagesBySessionId(sessionId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/chat/sessions/:sessionId/messages", isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check if session exists and user owns it
    const session = await storage.getChatSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Save user message
    const userMessage = await storage.createMessage({
      sessionId,
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
    const aiMessage = await storage.createMessage({
      sessionId,
      role: "assistant",
      content: aiContent
    });

    res.json({
      message: aiContent,
      sessionId,
    });

  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ 
      error: "Failed to process message"
    });
  }
});

// Delete a chat session (protected)
app.delete("/api/chat/sessions/:sessionId", isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const session = await storage.getChatSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    await storage.deleteChatSession(sessionId);
    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat session:", error);
    res.status(500).json({ error: "Failed to delete chat session" });
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