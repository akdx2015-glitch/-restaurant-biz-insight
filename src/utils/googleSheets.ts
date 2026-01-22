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
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    resolve(results.data);
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
