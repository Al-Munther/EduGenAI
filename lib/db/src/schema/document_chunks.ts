import { pgTable, serial, text, integer, timestamp, jsonb, index, vector } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { uploadedFilesTable } from "./uploaded_files";

export const documentChunksTable = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  fileId: integer("file_id").notNull().references(() => uploadedFilesTable.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  metadata: jsonb("metadata").$type<{
    pageNumber?: number;
    charStart: number;
    charEnd: number;
    totalPages?: number;
  }>().notNull().default({ charStart: 0, charEnd: 0 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("chunks_course_idx").on(table.courseId),
  index("chunks_file_idx").on(table.fileId),
]);

export const insertDocumentChunkSchema = createInsertSchema(documentChunksTable).omit({ id: true, createdAt: true });
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
export type DocumentChunk = typeof documentChunksTable.$inferSelect;
