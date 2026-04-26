import { useEffect, useState } from "react";
import { api } from "../api/client";

export type Column = {
    name: string;
    type: string;
}

type Filter = {
    column: string;
    value: string;
}

type PrimaryKey = {
    name: string;
    isSerial: boolean;
};

type Props = {
    tableName: string;
}

export default function DataTable({ tableName }: Props) {
    const [data, setData] = useState<any[]>([]);
    const [schema, setSchema] = useState<Column[]>([]);
    const [primaryKey, setPrimaryKey] = useState<PrimaryKey | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    const [filters, setFilters] = useState<Filter[]>([
        { column: "", value: "" }
    ]);

    const [editingRow, setEditingRow] = useState<number | null>(null);
    const [editedRow, setEditedRow] = useState<any>({});
    const [newRow, setNewRow] = useState<any>({});

    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [loadingSchema, setLoadingSchema] = useState(false);

    const movePrimaryKeyFirst = (columns: Column[], primaryKeyName?: string) => {
        if (!primaryKeyName) {
            return columns;
        }

        const primaryKeyColumn = columns.find((column) => column.name === primaryKeyName);

        if (!primaryKeyColumn) {
            return columns;
        }

        return [
            primaryKeyColumn,
            ...columns.filter((column) => column.name !== primaryKeyName),
        ];
    };

    const fetchSchema = async () => {
        setLoadingSchema(true);
        try {
            const res = await api.get(`datasets/${tableName}/schema/`);
            const primaryKeyName = res.data.primaryKey?.name ?? res.data.primaryKey;

            setSchema(movePrimaryKeyFirst(res.data.columns, primaryKeyName));
            setPrimaryKey(res.data.primaryKey);

            const orderedColumns = movePrimaryKeyFirst(res.data.columns, primaryKeyName);

            if (orderedColumns.length > 0) {
                setFilters([{ column: orderedColumns[0].name, value: "" }]);
            }
        } catch (err) {
            console.error("Error fetching schema:", err);
        } finally {
            setLoadingSchema(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `datasets/${tableName}?page=${page}&limit=${limit}`;

            filters.forEach((f) => {
                if (f.value.trim() !== "" && f.column.trim() !== "") {
                    url += `&${f.column}=${encodeURIComponent(f.value)}`;
                }
            });

            const res = await api.get(url);
            console.log("Fetched data:", res.data);
            setData(res.data.data);
            setTotal(res.data.total);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tableName) {
            fetchSchema();
            setPage(1);
        }
    }, [tableName]);

    useEffect(() => {
        if (tableName) {
            fetchData();
        }
    }, [tableName, page, limit]);

    const totalPages = Math.ceil(total / limit);

    const addFilter = () => {
        setFilters([...filters, { column: "", value: "" }]);
    };

    const removeFilter = (index: number) => {
        setFilters(filters.filter((_, i) => i !== index));
    }

    const updateFilter = (index: number, field: "column" | "value", value: string) => {
        const newFilters = [...filters];
        newFilters[index][field] = value;
        setFilters(newFilters);
    };

    const insertRow = async () => {
        setActionLoading(true);
        resetFeedback();
        try {
            console.log("Inserting row:", newRow);
            await api.post(`datasets/${tableName}`, {
                data: [newRow]
            });

            setMessage("Row inserted successfully");
            setNewRow({});
            fetchData();

        } catch (err: any) {
            const msg = err.response?.data?.error || "Insert failed";
            setError(msg);

        } finally {
            setActionLoading(false);
        }
    }

    const updateRow = async (row: any) => {
        setActionLoading(true);
        resetFeedback();
        try {
            await api.put(`/datasets/${tableName}`, {
                data: editedRow,
                where: {
                    [primaryKey!.name]: row[primaryKey!.name]
                }
            });

            setMessage("Row updated successfully");
            setEditingRow(null);
            fetchData();

        } catch (err: any) {
            const msg = err.response?.data?.error || "Update failed";
            setError(msg);

        } finally {
            setActionLoading(false);
        }
    }

    const deleteRow = async (row: any) => {
        if (window.confirm("Are you sure you want to delete this row?")) {
            setActionLoading(true);
            resetFeedback();
            try {
                await api.delete(`/datasets/${tableName}`, {
                    data: {
                        where: {
                            [primaryKey!.name]: row[primaryKey!.name]
                        }
                    }
                });

                setMessage("Row deleted successfully");
                fetchData();

            } catch (err: any) {
                const msg = err.response?.data?.error || "Delete failed";
                setError(msg);

            } finally {
                setActionLoading(false);
            }
        }
    }

    const resetFeedback = () => {
        setMessage(null);
        setError(null);
    };

    return (
        <div style={{ padding: "1rem" }}>
            <h3>Data Preview: {tableName}</h3>

            {/* Filters */}
            <div style={{ marginBottom: "1rem" }}>
                <h4>Filters</h4>

                {filters.map((f, index) => (
                    <div key={index} style={{ marginBottom: "0.5rem" }}>
                        <select
                            value={f.column}
                            onChange={(e) =>
                                updateFilter(index, "column", e.target.value)
                            }
                            disabled={loadingSchema}
                        >
                            <option value="">Select column</option>
                            {schema.map((col) => (
                                <option key={col.name} value={col.name}>
                                    {col.name} ({col.type})
                                </option>
                            ))}
                        </select>

                        <input
                            style={{ marginLeft: "0.5rem" }}
                            placeholder="Value"
                            value={f.value}
                            onChange={(e) =>
                                updateFilter(index, "value", e.target.value)
                            }
                        />

                        <button
                            style={{ marginLeft: "0.5rem" }}
                            onClick={() => removeFilter(index)}
                        >
                            Remove
                        </button>
                    </div>
                ))}

                <button onClick={addFilter}>+ Add Filter</button>

                <button
                    style={{ marginLeft: "0.5rem" }}
                    onClick={() => {
                        setPage(1);
                        fetchData();
                    }}
                    disabled={loading}
                >
                    Apply
                </button>
            </div>

            {/* Loading */}
            {loadingSchema && <p>Loading schema...</p>}
            {loading && <p>Loading data...</p>}

            {/* Insert New Row */}
            <div style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "10px" }}>
                <h4>Add New Row</h4>

                {schema.map((col) => {
                    if (col.name === primaryKey?.name && primaryKey?.isSerial) {
                        return null; // hide input for serial primary key
                    }

                    return (
                        <input
                            key={col.name}
                            placeholder={col.name}
                            style={{ marginRight: "5px", marginBottom: "5px" }}
                            value={newRow[col.name] || ""}
                            onChange={(e) =>
                                setNewRow({ ...newRow, [col.name]: e.target.value })
                            }
                        />
                    );
                })}

                <button
                    disabled={actionLoading}
                    onClick={insertRow}
                >
                    Insert
                </button>
            </div>

            {message && (
                <div style={{
                    marginBottom: "10px",
                    padding: "8px",
                    background: "#e6ffed",
                    border: "1px solid #b7eb8f"
                }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{
                    marginBottom: "10px",
                    padding: "8px",
                    background: "#fff1f0",
                    border: "1px solid #ffa39e"
                }}>
                    {error}
                </div>
            )}

            {/* Table */}
            {!loading && data.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            borderCollapse: "collapse",
                            width: "100%",
                            marginBottom: "1rem"
                        }}
                    >
                        <thead>
                            <tr>
                                {schema.map((col) => (
                                    <th
                                        key={col.name}
                                        style={{
                                            border: "1px solid #ccc",
                                            padding: "6px",
                                            background: col.name === primaryKey?.name ? "#e6f0ff" : "#f5f5f5"
                                        }}
                                    >
                                        {col.name} {col.name === primaryKey?.name && "🔑"}
                                        <div style={{ fontSize: "0.8rem", color: "#666" }}>
                                            {col.type}
                                        </div>
                                    </th>
                                ))}
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i}>
                                    {schema.map((col) => (
                                        <td
                                            key={col.name}
                                            style={{
                                                border: "1px solid #ccc",
                                                padding: "6px",
                                                background: col.name === primaryKey?.name ? "#f0f7ff" : "white"
                                            }}
                                        >
                                            {editingRow === i ? (
                                                <input
                                                    disabled={col.name === primaryKey?.name} // disable input for primary key
                                                    value={editedRow[col.name] || ""}
                                                    onChange={(e) =>
                                                        setEditedRow({
                                                            ...editedRow,
                                                            [col.name]: e.target.value
                                                        })
                                                    }
                                                />
                                            ) : (
                                                row[col.name] !== null
                                                    ? String(row[col.name])
                                                    : "NULL"
                                            )}
                                        </td>
                                    ))}

                                    <td>
                                        {editingRow === i ? (
                                            <>
                                                <button
                                                    disabled={actionLoading}
                                                    onClick={() => updateRow(row)}
                                                >
                                                    Save
                                                </button>

                                                <button onClick={() => setEditingRow(null)}>
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingRow(i);
                                                        setEditedRow({ ...row });
                                                    }}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    disabled={actionLoading}
                                                    onClick={() => deleteRow(row)}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty */}
            {!loading && data.length === 0 && (
                <p>No data available</p>
            )}

            <div style={{ marginBottom: "1rem" }}>
                <label>Rows per page: </label>

                <select
                    value={limit}
                    onChange={(e) => {
                        setLimit(Math.min(Number(e.target.value), 50));
                        setPage(1);
                    }}
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>

            {/* Pagination */}
            <div>
                <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                >
                    Prev
                </button>

                <span style={{ margin: "0 1rem" }}>
                    Page {page} / {totalPages || 1}
                </span>

                <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
};