import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import savedCoursesRouter from "./saved-courses";
import tutorRouter from "./tutor";
import progressRouter from "./progress";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(savedCoursesRouter);
router.use(tutorRouter);
router.use(progressRouter);

export default router;
