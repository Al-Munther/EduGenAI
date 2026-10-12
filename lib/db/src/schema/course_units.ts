import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";

export const courseUnitsTable = pgTable("course_units", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
  status: text("status").notNull().default("pending_review"),
  teacherNotes: text("teacher_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCourseUnitSchema = createInsertSchema(courseUnitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourseUnit = z.infer<typeof insertCourseUnitSchema>;
export type CourseUnit = typeof courseUnitsTable.$inferSelect;
