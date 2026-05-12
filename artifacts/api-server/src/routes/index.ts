import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import tutorRouter from "./tutor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(tutorRouter);

export default router;
