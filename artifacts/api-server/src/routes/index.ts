import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import reservationsRouter from "./reservations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(reservationsRouter);
router.use(dashboardRouter);

export default router;
