import { useState } from "react";
import { api } from "../api/client";

type Result = {
    message: string;
    results: {
        file: string;
        status: "success" | "failed";
        error?: string;
        hint?: string;
        table?: string;
        rows?: number;
    }[];
}

type Props = {
    onSuccess: () => void;
}

export default function UploadModal({ onSuccess }: Props) {
    const [files, setFiles] = useState<FileList | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    const upload = async (overwrite = false) => {
        if (!files || files.length === 0) return;

        const formData = new FormData();

        Array.from(files).forEach((file) => {
            formData.append('files', file);
        });

        setLoading(true);
        try {
            const res = await api.post(
                `/upload?overwrite=${overwrite}`,
                formData,
            )

            console.log('Upload result:', res.data);
            setResult(res.data);

            // detect conflicts 
            const conflicts = res.data.results.filter(
                (r: any) =>
                    r.status === 'failed' &&
                    r.error?.includes('already exists')
            )

            // show msg which files already exist and ask for confirmation to overwrite
            if (conflicts.length > 0 && !overwrite) {
                const fileList = conflicts.map((c: any) => c.file).join("\n");
                const message = `The following datasets already exist:\n\n${fileList}\n\nOverwrite them?`;

                const confirm = window.confirm(message);

                if (confirm) {
                    await upload(true);
                    return;
                }
            }

            onSuccess();

        } catch (err: any) {
            console.error('Failed to upload files:', err);
            const msg = err.response?.data?.error;
            if (msg) {
                alert(msg);
            }
            
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h4>Upload Dataset</h4>

            <p>Supported formats: CSV (.csv), Excel (.xlsx)</p>

            <input
                type="file"
                multiple
                accept=".csv,.xlsx"
                onChange={(e) => setFiles(e.target.files)}
            />

            {files && (
                <ul>
                    {Array.from(files).map((f, i) => (
                        <li key={i}>{f.name}</li>
                    ))}
                </ul>
            )}

            <button onClick={() => upload(false)} disabled={loading}>
                {loading ? "Uploading..." : "Upload"}
            </button>

            {result && <ul>
                {result.results.map((r, i) => (
                    <li key={i}>
                        {r.status === "success" ? "✔" : "✖"} {r.file} — {r.status}
                        {r.error && ` (${r.error})`}
                        {r.hint && ` Hint: ${r.hint}`}
                        {r.table && ` Created Table: ${r.table}`}
                        {r.rows !== undefined && ` Inserted Rows: ${r.rows}`}
                    </li>
                ))}
            </ul>}
        </div>
    );
}