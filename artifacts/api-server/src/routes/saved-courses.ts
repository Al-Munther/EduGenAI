import { Router, type IRouter } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { handleRouteError } from "../lib/route-error";

const router: IRouter = Router();

router.get("/courses/saved", async (req, res): Promise<void> => {
  try {
    const courses = await db.select().from(coursesTable).orderBy(desc(coursesTable.createdAt));
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error listing courses");
    handleRouteError(res, err, "ListSavedCourses");
  }
});

router.post("/courses/saved", async (req, res): Promise<void> => {
  try {
    const { title, description, assessmentPlan, units, questions, pdfText, filename } = req.body as {
      title: string;
      description: string;
      assessmentPlan: string;
      units: object[];
      questions: object[];
      pdfText: string;
      filename: string;
    };

    if (!title || !units || !questions) {
      res.status(400).json({ error: "title, units, and questions are required" });
      return;
    }

    const [course] = await db
      .insert(coursesTable)
      .values({
        title,
        description: description || "",
        assessmentPlan: assessmentPlan || "",
        units: units || [],
        questions: questions || [],
        pdfText: pdfText || "",
        filename: filename || "",
        status: "published",
      })
      .returning();

    res.status(201).json(course);
  } catch (err) {
    req.log.error({ err }, "Error publishing course");
    handleRouteError(res, err, "SaveCourse");
  }
});

router.get("/courses/saved/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    res.json(course);
  } catch (err) {
    req.log.error({ err }, "Error getting course");
    handleRouteError(res, err, "GetSavedCourse");
  }
});

router.delete("/courses/saved/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const deleted = await db.delete(coursesTable).where(eq(coursesTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "Course not found" }); return; }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting course");
    handleRouteError(res, err, "DeleteSavedCourse");
  }
});

export default router;
