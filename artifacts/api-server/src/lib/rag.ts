import { pool } from "@workspace/db";
import { generateEmbedding } from "./ollama";
import type { Chunk } from "./chunking";
import { logger } from "./logger";

const TOP_K = parseInt(process.env.RAG_TOP_K || "5", 10);
const SIMILARITY_THRESHOLD = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || "0.5");

export interface RetrievedChunk {
  id: number;
  courseId: number;
  fileId: number;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: {
    pageNumber?: number;
    charStart: number;
    charEnd: number;
    totalPages?: number;
  };
}

export async function storeChunks(
  courseId: number,
  fileId: number,
  chunks: Chunk[],
): Promise<void> {
  logger.info({ courseId, fileId, chunkCount: chunks.length }, "Storing chunks with embeddings");
  console.log(`[RAG] courseId=${courseId} fileId=${fileId}: Generating embeddings for ${chunks.length} chunks`);

  let embeddingDim = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const preview = chunk.content.substring(0, 100).replace(/\s+/g, " ").trim();
    console.log(`[RAG] courseId=${courseId}: Chunk ${i}/${chunks.length} (${chunk.content.length} chars): "${preview}..."`);

    const embedding = await generateEmbedding(chunk.content);
    if (embeddingDim === 0) {
      embeddingDim = embedding.length;
      console.log(`[RAG] courseId=${courseId}: Embedding dimension = ${embeddingDim}`);
    }

    const metadata = JSON.stringify({
      pageNumber: chunk.pageNumber,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
    });

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO document_chunks (course_id, file_id, chunk_index, content, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb)`,
        [courseId, fileId, chunk.index, chunk.content, `[${embedding.join(",")}]`, metadata],
      );
    } finally {
      client.release();
    }
  }

  const countClient = await pool.connect();
  try {
    const countResult = await countClient.query(
      "SELECT COUNT(*) as count FROM document_chunks WHERE course_id = $1",
      [courseId],
    );
    console.log(`[RAG] courseId=${courseId}: Total document_chunks after insert: ${countResult.rows[0].count}`);
  } finally {
    countClient.release();
  }

  logger.info({ fileId, chunkCount: chunks.length }, "All chunks stored successfully");
}

export async function deleteOldChunks(courseId: number, fileId: number): Promise<void> {
  const client = await pool.connect();
  try {
    const beforeResult = await client.query(
      "SELECT COUNT(*) as count FROM document_chunks WHERE course_id = $1 AND file_id = $2",
      [courseId, fileId],
    );
    console.log(`[RAG] courseId=${courseId} fileId=${fileId}: Deleting ${beforeResult.rows[0].count} old chunks`);

    await client.query(
      "DELETE FROM document_chunks WHERE course_id = $1 AND file_id = $2",
      [courseId, fileId],
    );

    logger.info({ courseId, fileId }, "Old chunks deleted");
  } finally {
    client.release();
  }
}

export async function retrieveRelevantChunks(
  courseId: number,
  query: string,
  topK = TOP_K,
  threshold = SIMILARITY_THRESHOLD,
): Promise<RetrievedChunk[]> {
  if (!courseId || courseId <= 0) {
    throw new Error(`retrieveRelevantChunks: courseId is required and must be a positive integer (got ${courseId})`);
  }
  if (!query || query.trim().length === 0) {
    throw new Error(`retrieveRelevantChunks: query is required (courseId=${courseId})`);
  }

  console.log(`[RAG] Retrieving chunks: courseId=${courseId} query="${query.substring(0, 80)}" topK=${topK} threshold=${threshold}`);

  const queryEmbedding = await generateEmbedding(query);
  console.log(`[RAG] Embedding generated: dimension=${queryEmbedding.length}`);

  const embeddingLiteral = `'[${queryEmbedding.join(",")}]'::vector`;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, course_id, file_id, chunk_index, content,
              1 - (embedding <=> ${embeddingLiteral}) AS similarity,
              metadata
       FROM document_chunks
       WHERE course_id = $1
         AND 1 - (embedding <=> ${embeddingLiteral}) >= $2
       ORDER BY similarity DESC
       LIMIT $3`,
      [courseId, threshold, topK],
    );

    console.log(`[RAG] Retrieved ${result.rows.length} chunks for courseId=${courseId}`);

    const retrieved = result.rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      fileId: row.file_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      similarity: parseFloat(row.similarity),
      metadata: row.metadata || { charStart: 0, charEnd: 0 },
    }));

    const chunkCourseIds = [...new Set(retrieved.map(c => c.courseId))];
    console.log(`[RAG] Retrieved chunk courseIds:`, chunkCourseIds);

    for (const c of retrieved) {
      const excerpt = c.content.substring(0, 150).replace(/\s+/g, " ").trim();
      console.log(`[RAG]   chunkId=${c.id} fileId=${c.fileId} courseId=${c.courseId} idx=${c.chunkIndex} sim=${c.similarity.toFixed(4)}: "${excerpt}..."`);
      if (c.courseId !== courseId) {
        throw new Error(
          `CRITICAL: Retrieved chunk id=${c.id} has courseId=${c.courseId} but requested courseId=${courseId}. ` +
          `This indicates a cross-course data leak bug that must be fixed immediately.`
        );
      }
    }

    logger.info({ matchCount: result.rows.length, requestedCourseId: courseId, retrievedCourseIds: chunkCourseIds }, "Retrieved chunks");

    return retrieved;
  } finally {
    client.release();
  }
}

export async function deleteAllCourseChunks(courseId: number): Promise<void> {
  const client = await pool.connect();
  try {
    const beforeResult = await client.query(
      "SELECT COUNT(*) as count FROM document_chunks WHERE course_id = $1",
      [courseId],
    );
    console.log(`[RAG] courseId=${courseId}: Deleting all ${beforeResult.rows[0].count} chunks`);
    await client.query(
      "DELETE FROM document_chunks WHERE course_id = $1",
      [courseId],
    );
    logger.info({ courseId, deletedCount: beforeResult.rows[0].count }, "All course chunks deleted");
  } finally {
    client.release();
  }
}

export async function getCourseChunkCount(courseId: number): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*) as count FROM document_chunks WHERE course_id = $1",
      [courseId],
    );
    const count = parseInt(result.rows[0].count, 10);
    console.log(`[RAG] courseId=${courseId}: chunk count = ${count}`);
    return count;
  } finally {
    client.release();
  }
}
