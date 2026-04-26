import { useEffect, useState } from "react";
import { api } from "../api/client";
import UploadModal from "./UploadModal";

type Props = {
    onSelectDataset: (datasetName: string) => void;
    activeDataset?: string | null;
};

export default function Sidebar({ onSelectDataset, activeDataset }: Props) {
    const [datasets, setDatasets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const getDatasets = async (preferredDataset?: string) => {
        setLoading(true);
        try {
            const res = await api.get('/datasets');
            console.log('Datasets:', res.data);
            setDatasets(res.data);

            if (preferredDataset && res.data.includes(preferredDataset)) {
                onSelectDataset(preferredDataset);
            } else if (!activeDataset && res.data.length > 0) {
                onSelectDataset(res.data[0]);
            }

        } catch (err: any) {
            console.error('Failed to fetch datasets:', err);
            const msg = err.response?.data?.error;
            if (msg) {
                alert(msg);
            }

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getDatasets();
    }, []);

    return (
        <div style={{
            width: 260,
            height: "100vh",
            borderRight: "1px solid #ddd",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            background: "#fafafa"
        }}>
            <h3 style={{ margin: 0 }}>Datasets</h3>

            {/* Upload */}
            <UploadModal onSuccess={(datasetName) => getDatasets(datasetName)} />

            {/* Loading */}
            {loading && <p style={{ fontSize: "0.9rem" }}>Loading...</p>}

            {/* Empty */}
            {!loading && datasets.length === 0 && (
                <p style={{ fontSize: "0.9rem", color: "#666" }}>No datasets available</p>
            )}

            {/* List */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                overflowY: "auto"
            }}>
                {datasets.map((d, i) => (
                    <button
                        key={i}
                        onClick={() => onSelectDataset(d)}
                        style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            border: "1px solid #ddd",
                            background: activeDataset === d ? "#007bff" : "white",
                            color: activeDataset === d ? "white" : "black",
                            cursor: "pointer",
                            borderRadius: "4px"
                        }}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>
    );
}