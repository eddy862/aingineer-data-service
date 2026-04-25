import { executeReadOnlyQuery } from "../services/query.service";
import { isReadOnlyQuery } from "../utils/sql.util";

export const runQuery = async (req: any, res: any) => {
    const { query } = req.body;

    try {
        if (typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ error: 'Query must be a non-empty string' });
        }

        // validate query is read-only
        if (!isReadOnlyQuery(query)) {
            return res.status(400).json({ error: 'Only read-only queries are allowed (SELECT or WITH)' });
        }

        const data = await executeReadOnlyQuery(query);

        res.json({
            rows: data.length,
            data
        });
    } catch (error: any) {
        console.error('Error executing query:', error);
        res.status(500).json({ 
            error: 'Invalid query',
            details: error.message 
        });
    }
};