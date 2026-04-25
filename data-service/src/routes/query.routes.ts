import { Router } from "express";
import { runQuery } from "../controllers/query.controller";

const router = Router();

router.post("/", runQuery);

export default router;