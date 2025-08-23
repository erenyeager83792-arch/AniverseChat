import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatMessageSchema, type ChatResponse } from "@shared/schema";
import { z } from "zod";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.PPLX_API_KEY || "";

if (!PERPLEXITY_API_KEY) {
  console.warn("Warning: PERPLEXITY_API_KEY not found in environment variables");
}

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new chat session
  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const session = await storage.createChatSession({
        title: "New Chat"
      });
      res.json(session);
    } catch (error) {
      console.error("Error creating chat session:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Get all chat sessions
  app.get("/api/chat/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllChatSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Get messages for a session
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

  // Send a message to Perplexity API
  app.post("/api/chat/sessions/:sessionId/messages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { content } = chatMessageSchema.parse(req.body);

      // Check if session exists
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Save user message
      await storage.createMessage({
        sessionId,
        role: "user",
        content,
      });

      // Get conversation history
      const messages = await storage.getMessagesBySessionId(sessionId);
      
      // Prepare messages for Perplexity API
      const perplexityMessages: PerplexityMessage[] = [
        {
          role: "system",
          content: "You are AniVerse AI, an intelligent assistant specialized in anime and manga. You have deep knowledge about anime series, manga titles, characters, storylines, recommendations, and the broader anime/manga culture. Provide detailed, accurate, and engaging responses about anime and manga topics. Be enthusiastic and knowledgeable while maintaining a friendly tone."
        },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }))
      ];

      if (!PERPLEXITY_API_KEY) {
        return res.status(500).json({ error: "Perplexity API key not configured" });
      }

      // Call Perplexity API
      const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: perplexityMessages,
          temperature: 0.2,
          top_p: 0.9,
          return_images: false,
          return_related_questions: false,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1
        }),
      });

      if (!perplexityResponse.ok) {
        const errorText = await perplexityResponse.text();
        console.error("Perplexity API error:", errorText);
        return res.status(500).json({ error: "Failed to get response from AI service" });
      }

      const perplexityData: PerplexityResponse = await perplexityResponse.json();
      const aiMessage = perplexityData.choices[0]?.message?.content;

      if (!aiMessage) {
        return res.status(500).json({ error: "Invalid response from AI service" });
      }

      // Save AI response
      await storage.createMessage({
        sessionId,
        role: "assistant",
        content: aiMessage,
      });

      const response: ChatResponse = {
        message: aiMessage,
        sessionId,
      };

      res.json(response);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message format" });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Delete a chat session
  app.delete("/api/chat/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.deleteChatSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
