import { Router, type IRouter } from "express";
import { ListAnalysisExamplesResponse } from "@workspace/api-zod";
import { EXAMPLES } from "../lib/example-data";

const router: IRouter = Router();

router.get("/analysis-examples", async (_req, res): Promise<void> => {
  res.json(ListAnalysisExamplesResponse.parse(EXAMPLES));
});

export default router;
