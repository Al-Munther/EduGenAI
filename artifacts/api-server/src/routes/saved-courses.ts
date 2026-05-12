import { Router, type IRouter } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/courses/saved", async (req, res): Promise<void> => {
  try {
    const courses = await db.select().from(coursesTable).orderBy(desc(coursesTable.createdAt));
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error listing courses");
    res.status(500).json({ error: "Failed to list courses" });
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
      .values({ title, description, assessmentPlan, units, questions, pdfText: pdfText || "", filename: filename || "" })
      .returning();

    res.status(201).json(course);
  } catch (err) {
    req.log.error({ err }, "Error publishing course");
    res.status(500).json({ error: "Failed to publish course" });
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
    res.status(500).json({ error: "Failed to get course" });
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
    res.status(500).json({ error: "Failed to delete course" });
  }
});

export default router;
