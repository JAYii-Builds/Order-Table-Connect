import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN;

// Support comma-separated list of allowed origins
const originList = allowedOrigin
  ? allowedOrigin.split(",").map((o) => o.trim()).filter(Boolean)
  : null;

app.use(
  cors(
    originList
      ? {
          origin: originList.length === 1 ? originList[0] : originList,
          credentials: true,
        }
      : undefined,
  ),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, message);
  res.status(500).json({ error: message });
});

export default app;
