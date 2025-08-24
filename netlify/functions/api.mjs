import express from 'express';
import serverless from 'serverless-http';
import crypto from 'crypto';

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

// Temporary simple authentication routes (for testing)
app.get("/api/auth/google", (req, res) => {
  res.json({ 
    message: "Google OAuth setup in progress", 
    redirectTo: "/",
    configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

app.get("/api/auth/google/callback", (req, res) => {
  res.redirect("/");
});

app.get("/api/logout", (req, res) => {
  res.redirect("/");
});

app.get('/api/auth/user', (req, res) => {
  // For now, return a demo user for testing
  res.json({
    id: 'demo-user',
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    profileImageUrl: ''
  });
});

// Session storage (in-memory for serverless)
const sessions = new Map();
const messages = new Map();

// Chat session routes
app.post("/api/chat/sessions", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const session = {
      id,
      title: req.body.title || "New Chat",
      userId: "demo-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    sessions.set(id, session);
    res.json(session);
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

app.get("/api/chat/sessions", async (req, res) => {
  try {
    const userSessions = Array.from(sessions.values()).filter(s => s.userId === "demo-user");
    res.json(userSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if session exists
    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const sessionMessages = messages.get(sessionId) || [];
    
    // Add initial greeting if no messages exist
    if (sessionMessages.length === 0) {
      const greetingMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        content: 'Hello! I\'m AniVerse AI, your anime and manga companion. What would you like to discuss today?',
        timestamp: new Date().toISOString()
      };
      sessionMessages.push(greetingMessage);
      messages.set(sessionId, sessionMessages);
    }
    
    res.json(sessionMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Check if session exists
    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(`[CHAT] Processing message for session ${sessionId}: "${content.substring(0, 50)}..."`); 

    // Get existing messages for context
    const sessionMessages = messages.get(sessionId) || [];
    
    // Save user message
    const userMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user", 
      content: content,
      timestamp: new Date().toISOString()
    };
    sessionMessages.push(userMessage);

    let aiResponse = "I'm currently in demo mode. Please configure your PERPLEXITY_API_KEY environment variable for full AI functionality.";

    // Call Perplexity API if available
    if (PERPLEXITY_API_KEY) {
      try {
        console.log('[CHAT] Calling Perplexity API with sonar model');
        
        // Prepare conversation history (last 10 messages for context)
        const recentMessages = sessionMessages.slice(-10);
        const perplexityMessages = [
          {
            role: "system",
            content: "You are AniVerse AI, an intelligent assistant specialized in anime and manga. You have deep knowledge about anime series, manga titles, characters, storylines, recommendations, and the broader anime/manga culture. Provide detailed, accurate, and engaging responses about anime and manga topics. Be enthusiastic and knowledgeable while maintaining a friendly tone. Always respond to greetings like 'hi', 'hello', 'hey' in a friendly manner."
          },
          ...recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ];
        
        const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "sonar",
            messages: perplexityMessages,
            temperature: 0.3,
            top_p: 0.9,
            return_images: false,
            return_related_questions: false,
            stream: false,
            presence_penalty: 0,
            frequency_penalty: 0.1
          })
        });

        if (perplexityResponse.ok) {
          const data = await perplexityResponse.json();
          aiResponse = data.choices?.[0]?.message?.content || aiResponse;
          console.log(`[CHAT] AI response received, length: ${aiResponse.length} characters`);
        } else {
          console.error(`[CHAT] Perplexity API error: ${perplexityResponse.status}`);
        }
      } catch (apiError) {
        console.error("[CHAT] Perplexity API error:", apiError);
        aiResponse = "Sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
      }
    }

    // Save AI response
    const aiMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString()
    };
    sessionMessages.push(aiMessage);
    
    // Update session timestamp
    const session = sessions.get(sessionId);
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);
    
    // Store updated messages
    messages.set(sessionId, sessionMessages);

    res.json({
      message: aiResponse,
      sessionId: sessionId,
    });

  } catch (error) {
    console.error("[CHAT] Error processing message:", error);
    res.status(500).json({ 
      error: "Failed to process message"
    });
  }
});

app.delete("/api/chat/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
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
    hasPerplexityKey: !!PERPLEXITY_API_KEY,
    environment: {
      hasGoogleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      hasDatabase: !!process.env.DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET
    }
  });
});

// Catch all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

export const handler = serverless(app);