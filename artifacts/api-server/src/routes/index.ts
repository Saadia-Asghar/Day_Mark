import { Router, type IRouter } from "express";
import healthRouter from "./health";
import homeRouter from "./home";
import memoriesRouter from "./memories";
import peopleRouter from "./people";
import calendarRouter from "./calendar";
import futureGiftsRouter from "./future-gifts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(homeRouter);
router.use(memoriesRouter);
router.use(peopleRouter);
router.use(calendarRouter);
router.use(futureGiftsRouter);

export default router;
