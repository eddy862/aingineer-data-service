import { Router } from "express";
import multer from "multer";
import { handleUpload } from "../controllers/upload.contoller";

const router = Router();

const upload = multer({
    dest: "uploads/",
    fileFilter: (req, file, cb) => {
        const isAllowed =
            file.mimetype === "text/csv" ||
            file.mimetype === "application/vnd.ms-excel" ||
            file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.originalname.toLowerCase().endsWith(".csv") ||
            file.originalname.toLowerCase().endsWith(".xlsx");

        if (!isAllowed) {
            return cb(new Error("Only CSV and XLSX files are allowed"));
        }

        cb(null, true);
    }
});

router.post(
    "/",
    upload.array("files", 10),
    handleUpload
);

export default router;