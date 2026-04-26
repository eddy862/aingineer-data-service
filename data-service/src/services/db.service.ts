import pool from '../db'

export const deleteRows = async (
    tableName: string,
    where: Record<string, any>
): Promise<number> => {
    const whereKeys = Object.keys(where);
    let idx = 1;
    const values: any[] = [];

    const whereClause = whereKeys.map(key => {
        values.push(where[key]);
        return `"${key}" = $${idx++}`;
    }).join(' AND ');

    const query = `DELETE FROM "${tableName}" WHERE ${whereClause}`;

    const result = await pool.query(query, values);
    return result.rowCount ?? 0;
}

export const updateRows = async (
    tableName: string,
    where: Record<string, any>,
    data: Record<string, any>
): Promise<number> => {
    const setKeys = Object.keys(data);
    const whereKeys = Object.keys(where);

    let idx = 1;
    const values: any[] = [];

    const setClause = setKeys.map(key => {
        values.push(data[key]);
        return `"${key}" = $${idx++}`;
    }).join(', ');

    const whereClause = whereKeys.map(key => {
        values.push(where[key]);
        return `"${key}" = $${idx++}`;
    }).join(' AND ');

    const query = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`;

    const result = await pool.query(query, values);

    return result.rowCount ?? 0;
}

export const countRows = async (
    tableName: string,
    filters: Record<string, any>
): Promise<number> => {
    let query = `SELECT COUNT(*) FROM "${tableName}"`;
    const values: any[] = [];
    let idx = 1;

    // filtering
    const conditions = Object.entries(filters).map(([key, value]) => {
        values.push(value);
        return `"${key}" = $${idx++}`;
    });

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
}

export const getRows = async (
    tableName: string,
    filters: Record<string, any>, // e.g. { column1: "value1", column2: 123 }
    limit: number,
    offset: number,
    orderBy?: string,
    selectColumns?: string[],
    direction: "ASC" | "DESC" = "ASC"
): Promise<any[]> => {
    const selectClause = selectColumns && selectColumns.length > 0
        ? selectColumns.map((column) => `"${column}"`).join(', ')
        : '*';

    let query = `SELECT ${selectClause} FROM "${tableName}"`;
    const values: any[] = [];
    let idx = 1;

    // filtering
    const conditions = Object.entries(filters).map(([key, value]) => {
        values.push(value);
        return `"${key}" = $${idx++}`;
    }); // results = ['"column1" = $1', '"column2" = $2']

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    if (orderBy) {
        query += ` ORDER BY "${orderBy}" ${direction}`;
    }

    // pagination
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
}

export const isSerialPK = async (table: string, pk: string) => {
  const res = await pool.query(
    `
    SELECT column_default
    FROM information_schema.columns
    WHERE table_name = $1
      AND column_name = $2
    `,
    [table, pk]
  );

  const def = res.rows[0]?.column_default;
  return def?.includes("nextval");
};

export const getPrimaryKey = async (tableName: string): Promise<string> => {
    const result = await pool.query(
        `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = $1
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
    `,
        [tableName]
    );

    if (!result.rows.length) {
        throw new Error(`No primary key found for table: ${tableName}`);
    }

    return result.rows[0].column_name;
};

export const getTableSchema = async (tableName: string): Promise<any[]> => {
    const query = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
            AND table_schema = 'public'
        ORDER BY ordinal_position
    `;

    const result = await pool.query(query, [tableName]);
    return result.rows;
};

export const getAllTables = async (): Promise<string[]> => {
    const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
    `;

    const result = await pool.query(query);
    return result.rows.map(row => row.table_name);
};

export const tableExists = async (tableName: string): Promise<boolean> => {
    const query = `
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
        )
    `;

    const result = await pool.query(query, [tableName]);
    return result.rows[0].exists;
};

export const dropTable = async (tableName: string) => {
    const query = `DROP TABLE IF EXISTS "${tableName}"`;
    await pool.query(query);
}

export const createTable = async (
    tableName: string,
    schema: Record<string, string>,
    primaryKey: string
) => {
    const columns = Object.entries(schema)
        .map(([col, type]) => {
            if (col === primaryKey) {
                return `"${col}" ${type} PRIMARY KEY`;
            }
            return `"${col}" ${type}`;
        })
        .join(", ");

    const query = `CREATE TABLE "${tableName}" (${columns});`;

    await pool.query(query);
};

export const insertRows = async (
    tableName: string,
    rows: any[]
) => {
    if (rows.length === 0) return;

    // rows = [{ column1: "value1", column2: 123 }, { column1: "value2", column2: 456 }]
    for (const row of rows) {
        const keys = Object.keys(row) // results = ["column1", "column2"]
        const values = Object.values(row) // results = ["value1", 123]

        const columns = keys.map(k => `"${k}"`).join(', '); // "column1", "column2"
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', '); // $1, $2

        const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`;

        await pool.query(query, values);
    }
};