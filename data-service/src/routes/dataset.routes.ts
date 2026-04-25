import { Router } from "express";
import { browseDataset, deleteFromDataset, getDatasetSchema, insertIntoDataset, listDatasets, updateDataset } from "../controllers/dataset.controller";
import { validateDataset } from "../middleware/dataset.middleware";

const router = Router();

router.get("/", listDatasets);
router.get("/:name", validateDataset, browseDataset);
router.get("/:name/schema", validateDataset, getDatasetSchema);
router.post("/:name", validateDataset, insertIntoDataset);
router.put("/:name", validateDataset, updateDataset);
router.delete("/:name", validateDataset, deleteFromDataset);

export default router;