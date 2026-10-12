import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";
import { courseUnitsTable } from "./course_units";

export const studentProgressTable = pgTable("student_progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().default(2).references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  unitId: integer("unit_id").notNull().references(() => courseUnitsTable.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  score: integer("score"),
  total: integer("total"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProgressSchema = createInsertSchema(studentProgressTable).omit({ id: true, updatedAt: true });
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type StudentProgress = typeof studentProgressTable.$inferSelect;
