import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { courseUnitsTable } from "./course_units";

export const courseQuestionsTable = pgTable("course_questions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => courseUnitsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull().default(""),
  chunkRef: text("chunk_ref"),
  status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCourseQuestionSchema = createInsertSchema(courseQuestionsTable).omit({ id: true, createdAt: true });
export type InsertCourseQuestion = z.infer<typeof insertCourseQuestionSchema>;
export type CourseQuestion = typeof courseQuestionsTable.$inferSelect;
