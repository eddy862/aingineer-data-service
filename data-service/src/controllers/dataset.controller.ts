import { countRows, deleteRows, getAllTables, getPrimaryKey, getRows, getTableSchema, insertRows, isFilterOperator, isSerialPK, RowFilters, updateRows } from "../services/db.service";
import { validColumns } from "../utils/schema.util";
import { coerceRow } from "../utils/typeCoercion.util";

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
        const [cols, primaryKey] = await Promise.all([
            getTableSchema(tableName),
            getPrimaryKey(tableName),
        ]);

        const isSerial = await isSerialPK(tableName, primaryKey);

        res.status(200).json({
            table: tableName,
            primaryKey: {
                name: primaryKey,
                isSerial: isSerial 
            },
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
        const limit = Math.min(parseInt(req.query.limit) || 50, 50);
        const offset = (page - 1) * limit;

        // filters
        const rawFilters = { ...req.query };
        delete rawFilters.page;
        delete rawFilters.limit;

        const filters: RowFilters = [];

        // validate filter columns
        const [validCols, cols, primaryKey] = await Promise.all([
            validColumns(tableName),
            getTableSchema(tableName),
            getPrimaryKey(tableName),
        ]);
        const schemaMap = new Map<string, string>(
            cols.map((c: any) => [c.column_name, c.data_type])
        );

        for (const key in rawFilters) {
            if (key.endsWith("__op")) {
                continue;
            }

            if (validCols.has(key)) {
                const rawOperator = rawFilters[`${key}__op`];
                const values = Array.isArray(rawFilters[key]) ? rawFilters[key] : [rawFilters[key]];
                const operators = Array.isArray(rawOperator) ? rawOperator : [rawOperator || "="];

                for (const [index, value] of values.entries()) {
                    const operator = operators[index] || operators[0] || "=";

                    if (!isFilterOperator(operator)) {
                        return res.status(400).json({
                            error: `Invalid operator "${operator}" for filter "${key}"`,
                            hint: 'Supported filter operators are: =, >, <, <=, >=.'
                        });
                    }

                    try {
                        const coerced = coerceRow({ [key]: value }, schemaMap);

                        filters.push({
                            column: key,
                            operator,
                            value: coerced[key],
                        });
                    } catch (err: any) {
                        return res.status(400).json({
                            error: err.message,
                            hint: "Ensure all filter values match their column types as defined in the dataset schema."
                        });
                    }
                }
            }
        }

        // make sure primary key col is the first column in the result for consistent sorting and pagination
        const orderedColumns = [
            primaryKey,
            ...cols.map((col: any) => col.column_name).filter((columnName: string) => columnName !== primaryKey),
        ];

        const [rows, total] = await Promise.all([
            getRows(tableName, filters, limit, offset, primaryKey, orderedColumns),
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
    const { data } = req.body; // expecting an array of objects

    try {
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({
                error: "Invalid input: Expected a non-empty array of objects",
                hint: "Please provide an array of objects to insert into the dataset."
            });
        }

        const cols = await getTableSchema(tableName);
        const validCols = new Set(cols.map((col: any) => col.column_name));

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

        const primaryKey = await getPrimaryKey(tableName);
        const isSerial = await isSerialPK(tableName, primaryKey);

        // if primary key is serial, remove it from input data to avoid conflicts
        if (isSerial) {
            for (const row of data) {
                delete row[primaryKey];
            }
        }

        const schemaMap = new Map<string, string>(
            cols.map((c: any) => [c.column_name, c.data_type])
        );

        const coercedData = [];

        for (const row of data) {
            try {
                const coerced = coerceRow(row, schemaMap);
                coercedData.push(coerced);
            } catch (err: any) {
                return res.status(400).json({
                    error: err.message,
                    hint: "Ensure all values in the input data match their respective column types as defined in the dataset schema."
                });
            }
        }

        await insertRows(tableName, coercedData);

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

        const cols = await getTableSchema(tableName);
        const validCols = new Set(cols.map((col: any) => col.column_name));

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

        const schemaMap = new Map<string, string>(
            cols.map((c: any) => [c.column_name, c.data_type])
        );

        const coercedData = {};
  
        // coerce update data values = convert the string values from the request into the appropriate types (e.g. numbers, booleans, dates) based on the dataset schema, so that they can be correctly stored in the database and match the column types defined in the dataset schema. This ensures data integrity and prevents type errors during the update operation.
        try {
            const coerced = coerceRow(data, schemaMap);
            Object.assign(coercedData, coerced);
        } catch (err: any) {
            return res.status(400).json({
                error: err.message,
                hint: "Ensure all values in the update data match their respective column types as defined in the dataset schema."
            });
        }

        const updatedCount = await updateRows(tableName, where, coercedData);

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
