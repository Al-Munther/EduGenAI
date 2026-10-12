import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  assessmentPlan: text("assessment_plan").notNull().default(""),
  units: jsonb("units").$type<object[]>().default([]),
  questions: jsonb("questions").$type<object[]>().default([]),
  pdfText: text("pdf_text").default(""),
  filename: text("filename").default(""),
  teacherId: integer("teacher_id").notNull().default(1).references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  processingStage: text("processing_stage").default(""),
  processingError: text("processing_error"),
  generationStatus: text("generation_status").default(""),
  generationError: text("generation_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
