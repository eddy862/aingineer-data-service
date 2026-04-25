import pool from '../db'

export const executeReadOnlyQuery = async (query: string) => {
  const result = await pool.query(query);
  return result.rows;
};