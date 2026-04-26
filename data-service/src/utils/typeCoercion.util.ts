const toNumber = (v: any) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (Number.isNaN(n)) throw new Error("Not a valid number");
    return n;
};

const toBoolean = (v: any) => {
    if (v === "" || v === null || v === undefined) return null;
    if (v === true || v === false) return v;
    const s = String(v).toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
    throw new Error("Not a valid boolean");
};

const toDate = (v: any) => {
    if (v === "" || v === null || v === undefined) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new Error("Not a valid date");
    return d.toISOString(); // safe for Postgres
};

const toText = (v: any) => {
    if (v === null || v === undefined) return null;
    return String(v);
};

const coerceValue = (value: any, type: string) => {
    switch (type) {
        case "integer":
        case "bigint":
        case "numeric":
        case "double precision":
        case "real":
            return toNumber(value);

        case "boolean":
            return toBoolean(value);

        case "date":
        case "timestamp":
        case "timestamp without time zone":
        case "timestamp with time zone":
            return toDate(value);

        case "text":
        case "character varying":
        case "varchar":
            return toText(value);

        default:
            return value; // fallback → let DB handle
    }
};

export const coerceRow = (row: any, schemaMap: Map<string, string>) => {
    const newRow: any = {};

    for (const key in row) {
        const type = schemaMap.get(key);

        if (!type) {
            throw new Error(`Invalid column "${key}"`);
        }

        try {
            newRow[key] = coerceValue(row[key], type);
        } catch (err: any) {
            throw new Error(`Column "${key}": ${err.message}`);
        }
    }

    return newRow;
};