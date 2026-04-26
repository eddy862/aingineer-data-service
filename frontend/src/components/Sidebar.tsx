import { useEffect, useState } from "react";
import { api } from "../api/client";
import UploadModal from "./UploadModal";

type Props = {
    onSelectDataset: (datasetName: string) => void;
};

export default function Sidebar({ onSelectDataset }: Props) {
    const [datasets, setDatasets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const getDatasets = async () => {
        setLoading(true);
        try {
            const res = await api.get('/datasets');
            console.log('Datasets:', res.data);
            setDatasets(res.data);

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
        <div style={{ width: 250 }}>
            <h3>Datasets</h3>

            {/* Upload */}
            <UploadModal onSuccess={getDatasets} />

            {/* Loading */}
            {loading && <p>Loading...</p>}

            {/* Empty */}
            {!loading && datasets.length === 0 && (
                <p>No datasets available</p>
            )}

            {/* List */}
            <ul>
                {datasets.map((d, i) => (
                    <li key={i}>
                        <button onClick={() => onSelectDataset(d)}>
                            {d}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}