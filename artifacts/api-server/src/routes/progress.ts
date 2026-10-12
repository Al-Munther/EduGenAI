import { Router, type IRouter } from "express";
import { db, studentProgressTable, testAttemptsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { handleRouteError } from "../lib/route-error";

const router: IRouter = Router();

router.get("/progress/:courseId", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const studentId = parseInt(req.query.studentId as string) || 2;

    const rows = await db
      .select()
      .from(studentProgressTable)
      .where(
        and(
          eq(studentProgressTable.courseId, courseId),
          eq(studentProgressTable.studentId, studentId),
        ),
      );

    res.json(rows.map((r) => ({
      unitId: r.unitId,
      completed: r.completed,
      score: r.score,
      total: r.total,
    })));
  } catch (err) {
    req.log.error({ err }, "Error getting progress");
    handleRouteError(res, err, "GetProgress");
  }
});

router.put("/progress", async (req, res): Promise<void> => {
  try {
    const { courseId, unitId, completed, score, total, studentId } = req.body as {
      courseId: number;
      unitId: number;
      completed: boolean;
      score?: number | null;
      total?: number | null;
      studentId?: number;
    };

    if (courseId === undefined || unitId === undefined || completed === undefined) {
      res.status(400).json({ error: "courseId, unitId, and completed are required" });
      return;
    }

    const sid = studentId || 2;

    const existing = await db
      .select()
      .from(studentProgressTable)
      .where(
        and(
          eq(studentProgressTable.courseId, courseId),
          eq(studentProgressTable.unitId, unitId),
          eq(studentProgressTable.studentId, sid),
        ),
      );

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(studentProgressTable)
        .set({
          completed,
          score: score ?? existing[0].score,
          total: total ?? existing[0].total,
        })
        .where(
          and(
            eq(studentProgressTable.courseId, courseId),
            eq(studentProgressTable.unitId, unitId),
            eq(studentProgressTable.studentId, sid),
          ),
        )
        .returning();
    } else {
      [result] = await db
        .insert(studentProgressTable)
        .values({
          studentId: sid,
          courseId,
          unitId,
          completed,
          score: score ?? null,
          total: total ?? null,
        })
        .returning();
    }

    res.json({
      unitId: result.unitId,
      completed: result.completed,
      score: result.score,
      total: result.total,
    });
  } catch (err) {
    req.log.error({ err }, "Error saving progress");
    handleRouteError(res, err, "SaveProgress");
  }
});

router.post("/tests/:courseId/attempts", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const { unitId, answers, score, total, studentId } = req.body as {
      unitId: number;
      answers: Array<{ questionId: number; selectedAnswer: string; correct: boolean }>;
      score: number;
      total: number;
      studentId?: number;
    };

    if (!unitId || score === undefined || !total) {
      res.status(400).json({ error: "unitId, score, and total are required" });
      return;
    }

    const sid = studentId || 2;

    const [attempt] = await db
      .insert(testAttemptsTable)
      .values({
        studentId: sid,
        courseId,
        unitId,
        score,
        total,
        answers: answers || [],
      })
      .returning();

    res.status(201).json(attempt);
  } catch (err) {
    req.log.error({ err }, "Error saving test attempt");
    handleRouteError(res, err, "SaveTestAttempt");
  }
});

router.get("/tests/:courseId/attempts", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const studentId = parseInt(req.query.studentId as string) || 2;

    const attempts = await db
      .select()
      .from(testAttemptsTable)
      .where(
        and(
          eq(testAttemptsTable.courseId, courseId),
          eq(testAttemptsTable.studentId, studentId),
        ),
      )
      .orderBy(desc(testAttemptsTable.createdAt));

    res.json(attempts);
  } catch (err) {
    req.log.error({ err }, "Error listing test attempts");
    handleRouteError(res, err, "ListTestAttempts");
  }
});

export default router;
