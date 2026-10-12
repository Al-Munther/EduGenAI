import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";

export const tutorConversationsTable = pgTable("tutor_conversations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().default(2).references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTutorConversationSchema = createInsertSchema(tutorConversationsTable).omit({ id: true, createdAt: true });
export type InsertTutorConversation = z.infer<typeof insertTutorConversationSchema>;
export type TutorConversation = typeof tutorConversationsTable.$inferSelect;
