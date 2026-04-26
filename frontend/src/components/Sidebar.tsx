import { useEffect, useState } from "react";
import { api } from "../api/client";
import UploadModal from "./UploadModal";

type Props = {
    onSelectDataset: (datasetName: string, forceRefresh?: boolean) => void;
    activeDataset?: string | null;
};

export default function Sidebar({ onSelectDataset, activeDataset }: Props) {
    const [datasets, setDatasets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const getDatasets = async (preferredDataset?: string, forceRefresh?: boolean) => {
        setLoading(true);
        try {
            const res = await api.get('/datasets');
            console.log('Datasets:', res.data);
            setDatasets(res.data);

            if (preferredDataset && res.data.includes(preferredDataset)) {
                onSelectDataset(preferredDataset, forceRefresh);
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
        <aside className="workspace__sidebar">
            <div>
                <h3 className="sidebar-title">Datasets</h3>
                <p className="sidebar-copy">Choose a dataset to browse, edit, and inspect its rows.</p>
            </div>

            {/* Upload */}
            <UploadModal
                onSuccess={(datasetName, forceRefresh) => getDatasets(datasetName, forceRefresh)}
            />

            <div className="sidebar-divider" />

            {/* Loading */}
            {loading && <p className="sidebar-note">Loading...</p>}

            {/* Empty */}
            {!loading && datasets.length === 0 && (
                <p className="sidebar-note">No datasets available</p>
            )}

            <p className="sidebar-note">Click a dataset to open its browse view.</p>
            {/* List */}
            <div className="sidebar-list">
                {datasets.map((d, i) => (
                    <button
                        key={i}
                        onClick={() => onSelectDataset(d)}
                        className={`sidebar-item ${activeDataset === d ? "sidebar-item--active" : ""}`}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </aside>
    );
}