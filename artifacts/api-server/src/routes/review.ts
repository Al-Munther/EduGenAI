import { Router, type IRouter } from "express";
import { db, coursesTable, courseUnitsTable, courseQuestionsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { handleRouteError } from "../lib/route-error";

const router: IRouter = Router();

router.get("/courses/:courseId/units", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const units = await db
      .select()
      .from(courseUnitsTable)
      .where(eq(courseUnitsTable.courseId, courseId))
      .orderBy(asc(courseUnitsTable.orderIndex));

    const questions = await db
      .select()
      .from(courseQuestionsTable)
      .where(eq(courseQuestionsTable.courseId, courseId));

    const result = units.map((unit) => ({
      ...unit,
      questions: questions.filter((q) => q.unitId === unit.id),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing units");
    handleRouteError(res, err, "ListUnits");
  }
});

router.put("/courses/:courseId/units/:unitId/approve", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    const unitId = parseInt(req.params.unitId);
    if (isNaN(courseId) || isNaN(unitId)) { res.status(400).json({ error: "Invalid ids" }); return; }

    const [updated] = await db
      .update(courseUnitsTable)
      .set({ status: "approved" })
      .where(and(eq(courseUnitsTable.id, unitId), eq(courseUnitsTable.courseId, courseId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error approving unit");
    handleRouteError(res, err, "ApproveUnit");
  }
});

router.put("/courses/:courseId/questions/:questionId/approve", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    const questionId = parseInt(req.params.questionId);
    if (isNaN(courseId) || isNaN(questionId)) { res.status(400).json({ error: "Invalid ids" }); return; }

    const [updated] = await db
      .update(courseQuestionsTable)
      .set({ status: "approved" })
      .where(and(eq(courseQuestionsTable.id, questionId), eq(courseQuestionsTable.courseId, courseId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Question not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error approving question");
    handleRouteError(res, err, "ApproveQuestion");
  }
});

router.get("/courses/:courseId/questions", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const questions = await db
      .select()
      .from(courseQuestionsTable)
      .where(eq(courseQuestionsTable.courseId, courseId))
      .orderBy(courseQuestionsTable.id);

    console.log(`[Questions] courseId=${courseId}: Returning ${questions.length} questions`);
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Error listing questions");
    handleRouteError(res, err, "ListQuestions");
  }
});

router.get("/courses/:courseId/units/:unitId/questions", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    const unitId = parseInt(req.params.unitId);
    if (isNaN(courseId) || isNaN(unitId)) { res.status(400).json({ error: "Invalid courseId or unitId" }); return; }

    const questions = await db
      .select()
      .from(courseQuestionsTable)
      .where(
        and(
          eq(courseQuestionsTable.courseId, courseId),
          eq(courseQuestionsTable.unitId, unitId),
        ),
      )
      .orderBy(courseQuestionsTable.id);

    console.log(`[Questions] courseId=${courseId} unitId=${unitId}: Returning ${questions.length} questions`);
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Error listing unit questions");
    handleRouteError(res, err, "ListUnitQuestions");
  }
});

router.put("/courses/:courseId/approve", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    if (course.status !== "review_pending") {
      res.status(400).json({ error: `Course status is "${course.status}". Must be "review_pending" to approve.` });
      return;
    }

    const units = await db
      .select()
      .from(courseUnitsTable)
      .where(eq(courseUnitsTable.courseId, courseId));

    if (units.length === 0) {
      res.status(400).json({ error: "No generated units found. Generate course content first." });
      return;
    }

    const questions = await db
      .select()
      .from(courseQuestionsTable)
      .where(eq(courseQuestionsTable.courseId, courseId));

    if (questions.length === 0) {
      res.status(400).json({ error: "No generated questions found. Generate course content first." });
      return;
    }

    await db
      .update(courseUnitsTable)
      .set({ status: "approved" })
      .where(eq(courseUnitsTable.courseId, courseId));

    await db
      .update(courseQuestionsTable)
      .set({ status: "approved" })
      .where(eq(courseQuestionsTable.courseId, courseId));

    const [updated] = await db
      .update(coursesTable)
      .set({ status: "approved" })
      .where(eq(coursesTable.id, courseId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error approving course");
    handleRouteError(res, err, "ApproveCourse");
  }
});

export default router;
