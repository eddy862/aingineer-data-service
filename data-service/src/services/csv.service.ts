import fs from 'fs';
import csv from 'csv-parser';

export const parseCSV = (
    filePath: string
): Promise<{ rows: any[]; headers: string[] }> => {
    return new Promise((resolve, reject) => {
        const rows: any[] = [];
        let headers: string[] = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("headers", (h) => {
                headers = h; // capture headers from the first row
            })
            .on("data", (data) => {
                if (Object.keys(data).length > 0) {
                    rows.push(data);
                }
            })
            .on("end", () => resolve({ rows, headers }))
            .on("error", reject);
    });
}; 