import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analysesRouter from "./analyses";
import communityRouter from "./community";
import examplesRouter from "./examples";
import waitlistRouter from "./waitlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysesRouter);
router.use(communityRouter);
router.use(examplesRouter);
router.use(waitlistRouter);

export default router;
