import { parseCSV } from "../services/csv.service";
import { createTable, dropTable, insertRows, tableExists } from "../services/db.service";
import { parseXLSX } from "../services/xlsx.service";
import { sanitizeTableName } from "../utils/db.util";
import { inferSchema } from "../utils/schema.util";
import fs from 'fs';

export const handleUpload = async (req: any, res: any) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];

    for (const file of files) {
        try {
            const rawTableName = file.originalname.replace(/\.(csv|xlsx)$/i, "");
            const tableName = sanitizeTableName(rawTableName);
            const overwrite = req.query.overwrite === 'true';

            const exists = await tableExists(tableName);

            // check if table exists and overwrite is not true, return error
            if (exists && !overwrite) {
                results.push({
                    file: file.originalname,
                    status: "failed",
                    error: `Table "${tableName}" already exists.`,
                    hint: "Rename the file or set overwrite=true to replace the existing table."
                });
                continue;
            }

            // if table exists and overwrite is true, drop the existing table
            if (exists && overwrite) {
                await dropTable(tableName);
            }

            let rows: any[] = [];
            let headers: string[] = [];

            const ext = file.originalname.toLowerCase();

            if (ext.endsWith(".csv")) {
                ({ rows, headers } = await parseCSV(file.path));
            } else if (ext.endsWith(".xlsx")) {
                ({ rows, headers } = parseXLSX(file.path));
            } else {
                results.push({
                    file: file.originalname,
                    status: "failed",
                    error: "Unsupported file type for schema inference.",
                    hint: "Please upload a CSV or XLSX file."
                });
                continue;
            }

            if (headers.length === 0) {
                results.push({
                    file: file.originalname,
                    status: "failed",
                    error: "No header row found.",
                    hint: "Please ensure your file has a header row."
                });
                continue;
            }

            if (rows.length === 0) {
                results.push({
                    file: file.originalname,
                    status: "failed",
                    error: "File must contain at least one data row for schema inference.",
                    hint: "Please ensure your file has data rows."
                });
                continue;
            }

            const schema = inferSchema(rows);

            await createTable(tableName, schema);
            await insertRows(tableName, rows);

            results.push({
                file: file.originalname,
                status: "success",
                table: tableName,
                rows: rows.length,
            });

        } catch (error: any) {
            console.error(`Error processing file ${file.originalname}:`, error);
            results.push({
                file: file.originalname,
                status: "failed",
                error: error.message
            });

        } finally {
            // clean up uploaded file
            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        }
    }

    res.json({
        message: "File processing completed",
        results
    });
};

