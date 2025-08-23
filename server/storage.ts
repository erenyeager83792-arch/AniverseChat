import { type ChatSession, type Message, type InsertChatSession, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getAllChatSessions(): Promise<ChatSession[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySessionId(sessionId: string): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;
  deleteChatSession(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private chatSessions: Map<string, ChatSession>;
  private messages: Map<string, Message>;

  constructor() {
    this.chatSessions = new Map();
    this.messages = new Map();
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const now = new Date();
    const session: ChatSession = { 
      ...insertSession, 
      id,
      createdAt: now,
      updatedAt: now,
      title: insertSession.title ?? null
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).sort(
      (a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id,
      timestamp: new Date()
    };
    this.messages.set(id, message);
    
    // Update session timestamp
    const session = this.chatSessions.get(insertMessage.sessionId);
    if (session) {
      session.updatedAt = new Date();
      this.chatSessions.set(insertMessage.sessionId, session);
    }
    
    return message;
  }

  async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async deleteMessage(id: string): Promise<void> {
    this.messages.delete(id);
  }

  async deleteChatSession(id: string): Promise<void> {
    this.chatSessions.delete(id);
    // Delete all messages in this session
    Array.from(this.messages.keys()).forEach(messageId => {
      const message = this.messages.get(messageId);
      if (message?.sessionId === id) {
        this.messages.delete(messageId);
      }
    });
  }
}

export const storage = new MemStorage();
