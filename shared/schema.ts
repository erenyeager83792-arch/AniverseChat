import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  sessionId: true,
  role: true,
  content: true,
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ChatMessageRequest = z.infer<typeof chatMessageSchema>;

export interface ChatResponse {
  message: string;
  sessionId: string;
}
