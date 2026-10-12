import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tutorConversationsTable } from "./tutor_conversations";

export const tutorMessagesTable = pgTable("tutor_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => tutorConversationsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources").$type<Array<{
    chunkIndex: number;
    pageNumber?: number;
    similarity: number;
    excerpt: string;
  }>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTutorMessageSchema = createInsertSchema(tutorMessagesTable).omit({ id: true, createdAt: true });
export type InsertTutorMessage = z.infer<typeof insertTutorMessageSchema>;
export type TutorMessage = typeof tutorMessagesTable.$inferSelect;
