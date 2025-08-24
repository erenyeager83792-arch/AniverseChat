import express from 'express';
import serverless from 'serverless-http';

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

// Chat session routes (simplified)
app.post("/api/chat/sessions", async (req, res) => {
  try {
    const id = crypto.randomUUID();
    const session = {
      id,
      title: req.body.title || "New Chat",
      userId: "demo-user",
      createdAt: new Date().toISOString()
    };
    res.json(session);
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

app.get("/api/chat/sessions", async (req, res) => {
  try {
    // Return sample sessions for demo
    const sessions = [{
      id: 'demo-session-1',
      title: 'Welcome to AniVerse AI',
      userId: 'demo-user',
      createdAt: new Date().toISOString()
    }];
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ error: "Failed to fetch chat sessions" });
  }
});

app.get("/api/chat/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Return sample messages for demo
    const messages = [
      {
        id: 'msg-1',
        sessionId,
        role: 'assistant',
        content: 'Hello! I\'m AniVerse AI, your anime and manga companion. What would you like to discuss today?',
        timestamp: new Date().toISOString()
      }
    ];
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

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Create user message
    const userMessage = {
      id: crypto.randomUUID(),
      sessionId,
      role: "user",
      content: content,
      timestamp: new Date().toISOString()
    };

    let aiResponse = "I'm currently in demo mode. Please set up your PERPLEXITY_API_KEY environment variable for full AI functionality.";

    // Call Perplexity API if available
    if (PERPLEXITY_API_KEY) {
      try {
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
                content: "You are AniVerse AI, an expert assistant specialized in anime and manga. Provide detailed, accurate, and enthusiastic responses about anime series, manga, characters, plot analysis, recommendations, and industry insights."
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

        if (perplexityResponse.ok) {
          const data = await perplexityResponse.json();
          aiResponse = data.choices?.[0]?.message?.content || aiResponse;
        }
      } catch (apiError) {
        console.error("Perplexity API error:", apiError);
      }
    }

    res.json({
      message: aiResponse,
      sessionId: sessionId,
    });

  } catch (error) {
    console.error("Error processing message:", error);
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