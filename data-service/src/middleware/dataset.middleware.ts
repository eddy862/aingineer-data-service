import { NextFunction, Request, Response } from "express";
import { tableExists } from "../services/db.service";

export const validateDataset = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const tableName = req.params.name;

    try {
        if (!tableName || typeof tableName !== 'string') {
            return res.status(400).json({
                error: "Table name is required and must be a string"
            });
        }

        const exists = await tableExists(tableName);

        if (!exists) {
            return res.status(404).json({
                error: `Table "${tableName}" not found`
            });
        }

        (req as any).tableName = tableName; 
        next();
    } catch (error) {
        console.error('Error validating dataset:', error);
        res.status(500).json({ error: 'Failed to validate dataset' });
    }
}