import { Router, type IRouter } from "express";
import { db, coursesTable, uploadedFilesTable, documentChunksTable, courseUnitsTable, courseQuestionsTable, studentProgressTable, testAttemptsTable, tutorConversationsTable, tutorMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { handleRouteError } from "../lib/route-error";

const router: IRouter = Router();

router.get("/courses", async (req, res): Promise<void> => {
  try {
    const courses = await db.select().from(coursesTable).orderBy(desc(coursesTable.createdAt));
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error listing courses");
    handleRouteError(res, err, "ListCourses");
  }
});

router.get("/courses/teacher/:teacherId", async (req, res): Promise<void> => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    if (isNaN(teacherId)) { res.status(400).json({ error: "Invalid teacherId" }); return; }

    const courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.teacherId, teacherId))
      .orderBy(desc(coursesTable.createdAt));

    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error listing teacher courses");
    handleRouteError(res, err, "ListTeacherCourses");
  }
});

router.get("/courses/published", async (req, res): Promise<void> => {
  try {
    const courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.status, "published"))
      .orderBy(desc(coursesTable.createdAt));

    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error listing published courses");
    handleRouteError(res, err, "ListPublishedCourses");
  }
});

router.post("/courses", async (req, res): Promise<void> => {
  try {
    console.log("CREATE COURSE REQ BODY:", req.body);

    const { title, description, teacherId, teacher_id } = req.body as {
      title: string;
      description?: string;
      teacherId?: number;
      teacher_id?: number;
    };

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "Validation failed", details: "title is required and must be a non-empty string" });
      return;
    }

    const resolvedTeacherId = teacherId ?? teacher_id ?? 1;

    console.log("CREATE COURSE INSERT:", { title, description, teacherId: resolvedTeacherId });

    const [course] = await db
      .insert(coursesTable)
      .values({
        title: title.trim(),
        description: description?.trim() || "",
        teacherId: resolvedTeacherId,
      })
      .returning();

    res.status(201).json(course);
  } catch (err) {
    req.log.error({ err }, "Error creating course");
    handleRouteError(res, err, "CreateCourse");
  }
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    res.json(course);
  } catch (err) {
    req.log.error({ err }, "Error getting course");
    handleRouteError(res, err, "GetCourse");
  }
});

router.put("/courses/:courseId/publish", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const [existing] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!existing) { res.status(404).json({ error: "Course not found" }); return; }

    console.log(`[Publish] courseId=${courseId}: status before publish = "${existing.status}"`);

    if (existing.status !== "approved") {
      console.log(`[Publish] courseId=${courseId}: REJECTED — status is "${existing.status}", need "approved"`);
      res.status(400).json({ error: "Course must be reviewed and approved before publishing." });
      return;
    }

    const { units, questions, assessmentPlan } = req.body as {
      units?: object[];
      questions?: object[];
      assessmentPlan?: string;
    };

    const [course] = await db
      .update(coursesTable)
      .set({
        status: "published",
        units: units || existing.units || [],
        questions: questions || existing.questions || [],
        assessmentPlan: assessmentPlan || existing.assessmentPlan || "",
      })
      .where(eq(coursesTable.id, courseId))
      .returning();

    console.log(`[Publish] courseId=${courseId}: status after publish = "${course.status}"`);
    req.log.info({ courseId }, "Course published");
    res.json(course);
  } catch (err) {
    req.log.error({ err }, "Error publishing course");
    handleRouteError(res, err, "PublishCourse");
  }
});

router.delete("/courses/:courseId", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    req.log.info({ courseId, title: course.title }, "Deleting course with related data");

    await db.delete(tutorMessagesTable).where(eq(tutorMessagesTable.conversationId, courseId));
    await db.delete(tutorConversationsTable).where(eq(tutorConversationsTable.courseId, courseId));
    await db.delete(testAttemptsTable).where(eq(testAttemptsTable.courseId, courseId));
    await db.delete(studentProgressTable).where(eq(studentProgressTable.courseId, courseId));
    await db.delete(courseQuestionsTable).where(eq(courseQuestionsTable.courseId, courseId));
    await db.delete(courseUnitsTable).where(eq(courseUnitsTable.courseId, courseId));
    await db.delete(documentChunksTable).where(eq(documentChunksTable.courseId, courseId));
    await db.delete(uploadedFilesTable).where(eq(uploadedFilesTable.courseId, courseId));
    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));

    req.log.info({ courseId }, "Course deleted successfully");
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting course");
    handleRouteError(res, err, "DeleteCourse");
  }
});

export default router;
