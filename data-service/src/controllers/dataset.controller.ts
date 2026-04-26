import { countRows, deleteRows, getAllTables, getRows, getTableSchema, insertRows, tableExists, updateRows } from "../services/db.service";
import { validColumns } from "../utils/schema.util";

export const listDatasets = async (req: any, res: any) => {
    try {
        const tables = await getAllTables();

        res.status(200).json(tables);

    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
};

export const getDatasetSchema = async (req: any, res: any) => {
    const tableName = req.params.name;
    try {
        const cols = await getTableSchema(tableName);

        res.status(200).json({
            table: tableName,
            columns: cols.map((col: any) => ({
                name: col.column_name,
                type: col.data_type
            }))
        });
    } catch (error) {
        console.error('Error fetching table schema:', error);
        res.status(500).json({ error: 'Failed to fetch table schema' });
    }
};

export const browseDataset = async (req: any, res: any) => {
    const tableName = req.params.name;

    try {
        // pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const offset = (page - 1) * limit;

        // filters
        const rawFilters = { ...req.query };
        delete rawFilters.page;
        delete rawFilters.limit;

        const filters: Record<string, any> = {};

        // validate filter columns
        const validCols = await validColumns(tableName);

        for (const key in rawFilters) {
            if (validCols.has(key)) {
                filters[key] = rawFilters[key];
            }
        }

        const [rows, total] = await Promise.all([
            getRows(tableName, filters, limit, offset),
            countRows(tableName, filters)
        ]);

        res.status(200).json({
            table: tableName,
            page,
            limit,
            total,
            data: rows
        });
    } catch (error) {
        console.error('Error browsing dataset:', error);
        res.status(500).json({ error: 'Failed to browse dataset' });
    }
};

export const insertIntoDataset = async (req: any, res: any) => {
    const tableName = req.params.name;
    const data = req.body; // expecting an array of objects

    try {
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({
                error: "Invalid input: Expected a non-empty array of objects",
                hint: "Please provide an array of objects to insert into the dataset."
            });
        }

        // validate columns in input data
        const validCols = await validColumns(tableName);

        for (const row of data) {
            for (const key in row) {
                if (!validCols.has(key)) {
                    return res.status(400).json({
                        error: `Invalid column "${key}" in input data`,
                        hint: `Please ensure all columns in the input data are valid. Valid columns are: ${[...validCols].join(", ")}.`
                    });
                }
            }
        }

        await insertRows(tableName, data);

        res.status(201).json({
            message: 'Rows inserted successfully',
            table: tableName,
            insertedCount: data.length
        });
    } catch (error) {
        console.error('Error inserting into dataset:', error);
        res.status(500).json({ error: 'Failed to insert into dataset' });
    }
};

export const updateDataset = async (req: any, res: any) => {
    const tableName = req.params.name;
    const { where, data } = req.body; // expecting { where: {...}, data: {...} }

    try {
        if (
            typeof where !== 'object' ||
            typeof data !== 'object' ||
            !where ||
            !data
        ) {
            return res.status(400).json({
                error: "Invalid input: Expected 'where' and 'data' to be objects",
                hint: "Please provide valid 'where' and 'data' objects."
            });
        }

        // validate columns in where and data
        const validCols = await validColumns(tableName);

        for (const key in where) {
            if (!validCols.has(key)) {
                return res.status(400).json({
                    error: `Invalid column "${key}" in filter conditions`,
                    hint: `Please ensure all columns in the filter conditions are valid. Valid columns are: ${[...validCols].join(", ")}.`
                });
            }
        }

        for (const key in data) {
            if (!validCols.has(key)) {
                return res.status(400).json({
                    error: `Invalid column "${key}" in update data`,
                    hint: `Please ensure all columns in the update data are valid. Valid columns are: ${[...validCols].join(", ")}.`
                });
            }
        }

        const updatedCount = await updateRows(tableName, where, data);

        if (updatedCount === 0) {
            return res.status(404).json({
                error: "No rows matched the filter conditions",
                hint: "Please ensure the filter conditions are correct and match existing rows in the dataset."
            });
        }

        res.json({
            message: 'Rows updated successfully',
            table: tableName,
            updatedCount
        });
    } catch (error) {
        console.error('Error updating dataset:', error);
        res.status(500).json({ error: 'Failed to update dataset' });
    }
};

export const deleteFromDataset = async (req: any, res: any) => {
    const tableName = req.params.name;
    const { where } = req.body; // expecting an object with filter conditions

    try {
        if (typeof where !== 'object' || !where) {
            return res.status(400).json({
                error: "Invalid input: Expected an object with filter conditions",
                hint: "Please provide a valid object with filter conditions to specify which rows to delete."
            });
        }

        if (!Object.keys(where).length) {
            return res.status(400).json({
                error: "Filter conditions cannot be empty.",
                hint: "Please provide at least one filter condition to specify which rows to delete."
            });
        }

        // validate columns in where
        const validCols = await validColumns(tableName);
        for (const key in where) {
            if (!validCols.has(key)) {
                return res.status(400).json({
                    error: `Invalid column "${key}" in filter conditions`,
                    hint: `Please ensure all columns in the filter conditions are valid. Valid columns are: ${[...validCols].join(", ")}.`
                });
            }
        }

        const deletedCount = await deleteRows(tableName, where);

        if (deletedCount === 0) {
            return res.status(404).json({
                error: "No rows matched the filter conditions",
                hint: "Please ensure the filter conditions are correct and match existing rows in the dataset."
            });
        }

        res.json({
            message: 'Rows deleted successfully',
            table: tableName,
            deletedCount
        });
    } catch (error) {
        console.error('Error deleting from dataset:', error);
        res.status(500).json({ error: 'Failed to delete from dataset' });
    }
};
