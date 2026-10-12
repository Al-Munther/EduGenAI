import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/debug/courses/:courseId/integrity", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const client = await pool.connect();
    try {
      const chunks = await client.query(
        "SELECT course_id, file_id, COUNT(*) as cnt FROM document_chunks WHERE course_id = $1 GROUP BY course_id, file_id",
        [courseId],
      );
      const chunksTotal = await client.query(
        "SELECT COUNT(*) as total FROM document_chunks WHERE course_id = $1",
        [courseId],
      );
      const units = await client.query(
        "SELECT id, course_id, title, order_index FROM course_units WHERE course_id = $1 ORDER BY order_index",
        [courseId],
      );
      const questions = await client.query(
        "SELECT id, course_id, unit_id, LEFT(question, 80) as question_preview FROM course_questions WHERE course_id = $1 ORDER BY id",
        [courseId],
      );
      const files = await client.query(
        "SELECT id, course_id, original_name, file_path, processed FROM uploaded_files WHERE course_id = $1 ORDER BY created_at",
        [courseId],
      );
      const course = await client.query(
        "SELECT id, title, status, processing_stage, generation_status FROM courses WHERE id = $1",
        [courseId],
      );

      res.json({
        course: course.rows[0] || null,
        uploadedFiles: files.rows,
        chunks: {
          total: parseInt(chunksTotal.rows[0]?.total || "0", 10),
          byFile: chunks.rows,
        },
        units: units.rows,
        questions: {
          total: questions.rows.length,
          list: questions.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

router.get("/debug/integrity", async (_req, res): Promise<void> => {
  try {
    const client = await pool.connect();
    try {
      const chunksByCourse = await client.query(
        "SELECT course_id, file_id, COUNT(*) as cnt FROM document_chunks GROUP BY course_id, file_id ORDER BY course_id, file_id",
      );
      const courses = await client.query(
        "SELECT id, title, status FROM courses ORDER BY id",
      );
      const unitsByCourse = await client.query(
        "SELECT course_id, COUNT(*) as cnt FROM course_units GROUP BY course_id ORDER BY course_id",
      );
      const questionsByCourse = await client.query(
        "SELECT course_id, COUNT(*) as cnt FROM course_questions GROUP BY course_id ORDER BY course_id",
      );
      const filesByCourse = await client.query(
        "SELECT course_id, COUNT(*) as cnt FROM uploaded_files GROUP BY course_id ORDER BY course_id",
      );

      res.json({
        courses: courses.rows,
        chunks: { byCourse: chunksByCourse.rows },
        units: { byCourse: unitsByCourse.rows },
        questions: { byCourse: questionsByCourse.rows },
        files: { byCourse: filesByCourse.rows },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

export default router;
