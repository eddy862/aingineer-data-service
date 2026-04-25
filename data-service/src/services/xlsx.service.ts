import XLSX from 'xlsx';

export const parseXLSX = (filePath: string): { rows: any[]; headers: string[] } => {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // only process the first sheet

    if (!sheetName) {
        throw new Error("No sheets found in the XLSX file.");
    }

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found in the XLSX file.`);
    }

    // convert to JSON 
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: null // keeps empty cells as null
    });

    const headerRow = ((XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][])[0] || []);

    const headers: string[] =
        rows.length > 0 ? Object.keys(rows[0]) // use keys from the first row if available
            : headerRow.map((cell) => String(cell ?? '')); // fallback to header row if no data rows

    return { rows, headers };
};