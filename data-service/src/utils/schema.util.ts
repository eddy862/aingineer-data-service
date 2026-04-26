import { getTableSchema } from "../services/db.service";

const TYPE_PRIORITY = ["BOOLEAN", "INTEGER", "BIGINT", "FLOAT", "TIMESTAMP", "TEXT"]; // from more general to more specific

const INT32_MIN = BigInt("-2147483648");
const INT32_MAX = BigInt("2147483647");
const INT64_MIN = BigInt("-9223372036854775808");
const INT64_MAX = BigInt("9223372036854775807");

// Merges multiple detected types into a single type based on priority
const mergeTypes = (types: string[]): string => {
  return types.reduce((finalType, current) => {
    return TYPE_PRIORITY.indexOf(current) > TYPE_PRIORITY.indexOf(finalType)
      ? current
      : finalType;
  }, "BOOLEAN");
};


const PK_CANDIDATES = ["id", "ID", "Id", "user_id", "uuid", "index", "Index", "INDEX"]; // common PK column names to check first

export const findPrimaryKey = (rows: any[]): string | null => {
  if (rows.length === 0) return null;

  const columns = Object.keys(rows[0]);

  // first check common PK candidates
  for (const col of columns) {
    if (!PK_CANDIDATES.includes(col)) continue;

    const values = rows.map(r => r[col]);

    if (values.some(v => v === null || v === "")) continue;

    const unique = new Set(values).size === values.length;

    if (unique) return col;
  }

  // if no common candidates, check all columns based on uniqueness and type heuristics
  for (const col of columns) {
    const values = rows.map(r => r[col]);

    if (values.some(v => v === null || v === "" || v === undefined)) continue;

    const unique = new Set(values).size === values.length;
    if (!unique) continue;

    const isIdLike =
      col.toLowerCase().includes("id") ||
      col.toLowerCase().endsWith("_key");

    if (isIdLike) {
      return col;
    }
  }

  return null;
};

const detectType = (value: any): string => {
  if (value === null || value === undefined || value === "") return "NULL";

  const val = String(value).trim();

  // boolean
  if (/^(true|false)$/i.test(val)) return "BOOLEAN";

  // integer
  if (/^-?\d+$/.test(val)) {
    const n = BigInt(val);
    if (n >= INT32_MIN && n <= INT32_MAX) return "INTEGER";
    if (n >= INT64_MIN && n <= INT64_MAX) return "BIGINT";
    return "TEXT";
  }

  // float
  if (/^-?\d+\.\d+$/.test(val)) return "FLOAT";

  // ISO date
  if (!isNaN(Date.parse(val))) return "TIMESTAMP";

  return "TEXT";
};

export const inferSchema = (rows: any[]): Record<string, string> => {
  const FORCE_TEXT_COLUMN = /(id|ean|sku|code|uuid|phone|zip|postal)/i; // heuristic to force certain columns to be TEXT

  const sampleSize = Math.min(rows.length, 20);
  const sample = rows.slice(0, sampleSize);

  const schema: Record<string, string[]> = {};

  for (const row of sample) {
    for (const key in row) {
      if (!schema[key]) schema[key] = [];

      const type = FORCE_TEXT_COLUMN.test(key) ? "TEXT" : detectType(row[key]);
      if (type !== "NULL" && !schema[key].includes(type)) {
        schema[key].push(type);
      }
    }
  }

  const finalSchema: Record<string, string> = {};

  if (Object.keys(schema).length === 0) {
    throw new Error("Unable to infer schema: No valid columns detected.");
  }

  for (const key in schema) {
    if (schema[key] === undefined) continue;
    if (schema[key].length === 0) {
      finalSchema[key] = "TEXT"; // default to TEXT if all values are null/empty
    } else {
      finalSchema[key] = mergeTypes(schema[key]);
    }
  }

  return finalSchema;
};

export const validColumns = async (tableName: string): Promise<Set<string>> => {
  const schema = await getTableSchema(tableName);
  return new Set(schema.map((col: any) => col.column_name));
};