import Papa from 'papaparse';

export const fetchGoogleSheetData = async (url: string): Promise<any[]> => {
    try {
        // Convert regular Google Sheet URL to CSV export URL
        // Example: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
        // To: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv

        let csvUrl = url;
        if (url.includes('/edit')) {
            csvUrl = url.split('/edit')[0] + '/export?format=csv';
        } else if (!url.endsWith('/export?format=csv')) {
            // Basic attempt to fix if ID is provided
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match) {
                csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
            }
        }

        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('구글 시트를 가져오는데 실패했습니다. 링크가 전체 공개(웹에 게시)되어 있는지 확인해주세요.');

        const csvText = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: false, // Read as array of arrays first
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    const rows = results.data as any[][];
                    if (!rows || rows.length === 0) {
                        resolve([]);
                        return;
                    }

                    // Import findHeaderRow dynamically to avoid circular dependency issues if any
                    // But since we are in utils, we can assume imports worked or we duplicated logic.
                    // For simplicity and robustness, let's look for common headers
                    const commonHeaders = ['날짜', 'Date', '구매처', 'Vendor', '품목', 'Item', '금액', 'Amount', '식재료명'];

                    let headerIndex = 0;
                    for (let i = 0; i < Math.min(rows.length, 20); i++) {
                        const rowStr = JSON.stringify(rows[i]);
                        if (commonHeaders.some(h => rowStr.includes(h))) {
                            headerIndex = i;
                            break;
                        }
                    }

                    const headers = rows[headerIndex].map((h: any) => String(h).trim());
                    const dataRows = rows.slice(headerIndex + 1);

                    const parsedData = dataRows.map(row => {
                        const obj: any = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index];
                        });
                        return obj;
                    });

                    resolve(parsedData);
                },
                error: (error: any) => {
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Google Sheet Sync Error:', error);
        throw error;
    }
};
