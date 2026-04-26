import { useState } from "react";
import { api } from "../api/client";

export default function QueryPanel() {
    const [query, setQuery] = useState(
        `-- Write a SELECT query
-- Example:
SELECT * FROM your_table LIMIT 10;

-- Join example:
-- SELECT *
-- FROM table1 t1
-- JOIN table2 t2 ON t1.id = t2.id;
`
    );

    const [result, setResult] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasRunQuery, setHasRunQuery] = useState(false);

    const runQuery = async () => {
        try {
            setLoading(true);
            setError(null);
            setResult([]);
            setHasRunQuery(true);

            const res = await api.post("/query", { query });

            const rows = res.data.data || [];

            console.log("Query result:", res.data);

            setResult(rows);

            if (rows.length > 0) {
                setColumns(Object.keys(rows[0]));
            } else {
                setColumns([]);
            }

        } catch (err: any) {
            const msg =
                err.response?.data?.error || "Query execution failed";
            const details = err.response?.data?.details;
            setError(msg + (details ? `: ${details}` : ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="panel panel--soft">
            <div className="panel__body">
                <h3 className="panel__title">Global SQL Query</h3>
                <p className="panel__subtitle">
                Global query mode. Write SQL here to query any available dataset.
                </p>

                {/* Query Input */}
                <textarea
                    rows={10}
                    className="control control--full query-editor code-preview"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {/* Actions */}
                <div className="control-row" style={{ marginTop: "0.75rem" }}>
                    <button
                        onClick={runQuery}
                        disabled={loading}
                        className="btn btn--primary"
                    >
                        {loading ? "Running..." : "Run Query"}
                    </button>

                    <button
                        onClick={() => {
                            setQuery("");
                            setResult([]);
                            setColumns([]);
                            setError(null);
                            setHasRunQuery(false);
                        }}
                        className="btn"
                    >
                        Clear
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="alert alert--error">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result.length > 0 && (
                    <div className="panel__section table-shell">
                        <p className="panel__subtitle" style={{ marginBottom: "0.75rem" }}>Total rows: {result.length}</p>
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        {columns.map((col) => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {result.map((row, i) => (
                                        <tr key={i}>
                                            {columns.map((col) => (
                                                <td key={col}>
                                                    {row[col] !== null
                                                        ? String(row[col])
                                                        : "NULL"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && result.length === 0 && (
                    <div className="notice notice--empty" style={{ marginTop: "1rem" }}>
                        {hasRunQuery
                            ? "The query returned no rows."
                            : "No query has been run yet. Enter SQL above and click Run Query to see results."}
                    </div>
                )}
            </div>
        </section>
    );
}