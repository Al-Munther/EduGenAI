import { Router, type IRouter } from "express";
import { db, studentProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/progress/:courseId", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const rows = await db
      .select()
      .from(studentProgressTable)
      .where(eq(studentProgressTable.courseId, courseId));

    res.json(rows.map((r) => ({ unitId: r.unitId, completed: r.completed, score: r.score, total: r.total })));
  } catch (err) {
    req.log.error({ err }, "Error getting progress");
    res.status(500).json({ error: "Failed to get progress" });
  }
});

router.put("/progress", async (req, res): Promise<void> => {
  try {
    const { courseId, unitId, completed, score, total } = req.body as {
      courseId: number;
      unitId: number;
      completed: boolean;
      score?: number | null;
      total?: number | null;
    };

    if (courseId === undefined || unitId === undefined || completed === undefined) {
      res.status(400).json({ error: "courseId, unitId, and completed are required" });
      return;
    }

    const existing = await db
      .select()
      .from(studentProgressTable)
      .where(and(eq(studentProgressTable.courseId, courseId), eq(studentProgressTable.unitId, unitId)));

    let result;
    if (existing.length > 0) {
      const [updated] = await db
        .update(studentProgressTable)
        .set({ completed, score: score ?? existing[0].score, total: total ?? existing[0].total })
        .where(and(eq(studentProgressTable.courseId, courseId), eq(studentProgressTable.unitId, unitId)))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(studentProgressTable)
        .values({ courseId, unitId, completed, score: score ?? null, total: total ?? null })
        .returning();
      result = inserted;
    }

    res.json({ unitId: result.unitId, completed: result.completed, score: result.score, total: result.total });
  } catch (err) {
    req.log.error({ err }, "Error saving progress");
    res.status(500).json({ error: "Failed to save progress" });
  }
});

export default router;
