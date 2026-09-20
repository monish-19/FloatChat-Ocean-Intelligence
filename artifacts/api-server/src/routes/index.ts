import { Router, type IRouter } from "express";
import healthRouter from "./health";
import oceanRouter from "./ocean";

const router: IRouter = Router();

router.use(healthRouter);
router.use(oceanRouter);

export default router;
