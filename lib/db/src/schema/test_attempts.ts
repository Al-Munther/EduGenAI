import { pgTable, serial, integer, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";
import { courseUnitsTable } from "./course_units";

export const testAttemptsTable = pgTable("test_attempts", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().default(2).references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => courseUnitsTable.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  total: integer("total").notNull().default(0),
  answers: jsonb("answers").$type<Array<{ questionId: number; selectedAnswer: string; correct: boolean }>>().notNull().default([]),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestAttemptSchema = createInsertSchema(testAttemptsTable).omit({ id: true, createdAt: true });
export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;
export type TestAttempt = typeof testAttemptsTable.$inferSelect;
