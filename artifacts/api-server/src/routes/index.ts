import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import homeRouter from "./home";
import memoriesRouter from "./memories";
import peopleRouter from "./people";
import calendarRouter from "./calendar";
import futureGiftsRouter from "./future-gifts";
import storageRouter from "./storage";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(homeRouter);
router.use(memoriesRouter);
router.use(peopleRouter);
router.use(calendarRouter);
router.use(futureGiftsRouter);
router.use(storageRouter);

export default router;
