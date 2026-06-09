import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storeRouter from "./store";
import productsRouter from "./products";
import importRouter from "./import";
import publicRouter from "./public";
import chatRouter from "./chat";
import storeInteractionsRouter from "./store-interactions";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/store", storeRouter);
router.use("/products", productsRouter);
router.use("/import", importRouter);
router.use("/public", publicRouter);
router.use("/chat", chatRouter);
router.use("/store-interactions", storeInteractionsRouter);

export default router;
