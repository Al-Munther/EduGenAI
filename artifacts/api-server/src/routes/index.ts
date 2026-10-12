import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import savedCoursesRouter from "./saved-courses";
import uploadRouter from "./upload";
import generateRouter from "./generate";
import reviewRouter from "./review";
import tutorRouter from "./tutor";
import progressRouter from "./progress";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(savedCoursesRouter);
router.use(uploadRouter);
router.use(generateRouter);
router.use(reviewRouter);
router.use(tutorRouter);
router.use(progressRouter);
router.use(debugRouter);

export default router;
