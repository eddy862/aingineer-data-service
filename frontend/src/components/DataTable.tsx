import { useEffect, useState } from "react";
import { api } from "../api/client";

export type Column = {
    name: string;
    type: string;
}

type Filter = {
    column: string;
    operator: FilterOperator;
    value: string;
}

type FilterOperator = "=" | ">" | "<" | "<=" | ">=";

const filterOperators: FilterOperator[] = ["=", ">", "<", "<=", ">="];

type PrimaryKey = {
    name: string;
    isSerial: boolean;
};

type Props = {
    tableName: string;
    refreshToken?: number;
}

export default function DataTable({ tableName, refreshToken = 0 }: Props) {
    const [data, setData] = useState<any[]>([]);
    const [schema, setSchema] = useState<Column[]>([]);
    const [primaryKey, setPrimaryKey] = useState<PrimaryKey | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    const [filters, setFilters] = useState<Filter[]>([
        { column: "", operator: "=", value: "" }
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
                setFilters([{ column: orderedColumns[0].name, operator: "=", value: "" }]);
            }
        } catch (err) {
            console.error("Error fetching schema:", err);
        } finally {
            setLoadingSchema(false);
        }
    };

    const fetchData = async (pageOverride = page) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: String(pageOverride),
                limit: String(limit),
            });

            filters.forEach((f) => {
                if (f.value.trim() !== "" && f.column.trim() !== "") {
                    params.append(f.column, f.value);
                    params.append(`${f.column}__op`, f.operator);
                }
            });

            const res = await api.get(`datasets/${tableName}?${params.toString()}`);
            console.log("Fetched data:", res.data);
            setData(res.data.data);
            setTotal(res.data.total);
        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError("Failed to fetch data: " + err.response?.data?.error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tableName) {
            fetchSchema();
            setPage(1);
        }
    }, [tableName, refreshToken]);

    useEffect(() => {
        if (tableName) {
            fetchData();
        }
    }, [tableName, page, limit, refreshToken]);

    const totalPages = Math.ceil(total / limit);

    const addFilter = () => {
        setFilters([...filters, { column: "", operator: "=", value: "" }]);
    };

    const removeFilter = (index: number) => {
        setFilters(filters.filter((_, i) => i !== index));
    }

    const updateFilter = (index: number, field: keyof Filter, value: string) => {
        const newFilters = [...filters];
        const currentFilter = newFilters[index];

        if (!currentFilter) {
            return;
        }

        if (field === "operator") {
            newFilters[index] = {
                ...currentFilter,
                operator: value as FilterOperator,
            };
        } else {
            newFilters[index] = {
                ...currentFilter,
                [field]: value,
            };
        }

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
            setError("Failed to insert row: " + msg);

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
            setError("Failed to update row: " + msg);

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
                setError("Failed to delete row: " + msg);

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
        <section className="panel panel--soft table-shell">
            <div className="panel__body">
            <h3 className="panel__title">Data Preview: {tableName}</h3>
            <p className="panel__subtitle">Browse, filter, edit, and insert rows for the selected dataset.</p>

            {/* Filters */}
            <div className="panel__section">
                <h4 className="section-title">Filters</h4>

                {filters.map((f, index) => (
                    <div key={index} className="control-row" style={{ marginBottom: "0.65rem" }}>
                        <select
                            value={f.column}
                            onChange={(e) =>
                                updateFilter(index, "column", e.target.value)
                            }
                            disabled={loadingSchema}
                            className="control"
                        >
                            <option value="">Select column</option>
                            {schema.map((col) => (
                                <option key={col.name} value={col.name}>
                                    {col.name} ({col.type})
                                </option>
                            ))}
                        </select>

                        <select
                            value={f.operator}
                            onChange={(e) =>
                                updateFilter(index, "operator", e.target.value)
                            }
                            className="control control--operator"
                            aria-label={`Operator for ${f.column || "filter"}`}
                        >
                            {filterOperators.map((operator) => (
                                <option key={operator} value={operator}>
                                    {operator}
                                </option>
                            ))}
                        </select>

                        <input
                            placeholder="Value"
                            value={f.value}
                            onChange={(e) =>
                                updateFilter(index, "value", e.target.value)
                            }
                            className="control"
                        />

                        <button
                            onClick={() => removeFilter(index)}
                            className="btn"
                        >
                            Remove
                        </button>
                    </div>
                ))}

                <div className="control-row">
                    <button onClick={addFilter} className="btn">+ Add Filter</button>

                    <button
                        onClick={() => {
                            setPage(1);
                            fetchData(1);
                        }}
                        disabled={loading}
                        className="btn btn--primary"
                    >
                        Apply
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loadingSchema && <p className="muted">Loading schema...</p>}
            {loading && <p className="muted">Loading data...</p>}

            {/* Insert New Row */}
            <div className="panel__section">
                <h4 className="section-title">Add New Row</h4>

                {schema.map((col) => {
                    if (col.name === primaryKey?.name && primaryKey?.isSerial) {
                        return null; // hide input for serial primary key
                    }

                    return (
                        <input
                            key={col.name}
                            placeholder={col.name}
                            value={newRow[col.name] || ""}
                            onChange={(e) =>
                                setNewRow({ ...newRow, [col.name]: e.target.value })
                            }
                            className="control control--tight"
                        />
                    );
                })}

                <button
                    disabled={actionLoading}
                    onClick={insertRow}
                    className="btn btn--primary"
                >
                    Insert
                </button>
            </div>

            {message && (
                <div className="alert alert--success">
                    {message}
                </div>
            )}

            {error && (
                <div className="alert alert--error">
                    {error}
                </div>
            )}

            {/* Table */}
            {!loading && data.length > 0 && (
                <div className="panel__section table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                {schema.map((col) => (
                                    <th
                                        key={col.name}
                                        className={col.name === primaryKey?.name ? "pk" : ""}
                                    >
                                        {col.name} {col.name === primaryKey?.name && "🔑"}
                                        <div className="muted" style={{ fontSize: "0.78rem" }}>
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
                                            className={col.name === primaryKey?.name ? "pk" : ""}
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
                                                    className="btn btn--primary"
                                                >
                                                    Save
                                                </button>

                                                <button onClick={() => setEditingRow(null)} className="btn">
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
                                                    className="btn"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    disabled={actionLoading}
                                                    onClick={() => deleteRow(row)}
                                                    className="btn btn--danger"
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
                <div className="notice notice--empty">No data available</div>
            )}

            <div className="control-row" style={{ marginTop: "1rem" }}>
                <label>Rows per page: </label>

                <select
                    value={limit}
                    onChange={(e) => {
                        setLimit(Math.min(Number(e.target.value), 50));
                        setPage(1);
                    }}
                    className="control control--tight"
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>

            {/* Pagination */}
            <div className="control-row" style={{ justifyContent: "space-between", marginTop: "0.5rem" }}>
                <button
                    disabled={page === 1 || loading}
                    onClick={() => setPage(page - 1)}
                    className="btn"
                >
                    Prev
                </button>

                <span className="muted">
                    Page {page} / {totalPages || 1}
                </span>

                <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(page + 1)}
                    className="btn"
                >
                    Next
                </button>
            </div>
            </div>
        </section>
    );
};
