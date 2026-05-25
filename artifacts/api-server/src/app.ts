import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import path from "path";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(
  cors({
    origin: (origin, callback) => {
      // Dynamic origin matching to support localhost and local network IPs (e.g. 172.20.10.3)
      if (!origin) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use("/api", router);

export default app;
