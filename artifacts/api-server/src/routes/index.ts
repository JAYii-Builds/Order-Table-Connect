import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import reservationsRouter from "./reservations";
import dashboardRouter from "./dashboard";
import eventsRouter from "./events";
import walkInsRouter from "./walk-ins";
import tableReservationsRouter from "./table-reservations";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(reservationsRouter);
router.use(dashboardRouter);
router.use(eventsRouter);
router.use(walkInsRouter);
router.use(tableReservationsRouter);
router.use(paymentsRouter);

export default router;
