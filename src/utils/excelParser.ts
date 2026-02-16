import { read, utils } from 'xlsx';
import type { RevenueData, IngredientData } from '../types';

const safeParseFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const numStr = val.replace(/[^\d.-]/g, '').trim();
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Helper to find value across multiple possible keys and improved date parsing
export const findValue = (row: any, keys: string[]): any => {
    // 1. Try exact match first - MUST BE NON-EMPTY
    for (const key of keys) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
    }

    // 2. Smart Match: Normalize row keys (remove spaces, lowercase)
    const rowKeys = Object.keys(row);

    for (const key of keys) {
        const cleanKey = key.replace(/\s+/g, '').toLowerCase();

        for (const rKey of rowKeys) {
            const cleanRKey = rKey.replace(/\s+/g, '').toLowerCase();
            const val = row[rKey];

            // A. Exact Normalized Match (e.g. "지출 금액" == "지출금액")
            // B. Containment Match (e.g. "지출금액(원)" contains "지출금액")
            if (cleanRKey === cleanKey || (cleanKey.length >= 2 && cleanRKey.includes(cleanKey))) {
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return val;
                }
            }
        }
    }
    return undefined;
};

// Excel date serial to ISO string
const formatDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
        // Excel serial date
        const date = new Date((val - (25567 + 2)) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    // Try parsing string
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return String(val);
};

// Helper to find header row index
export const findHeaderRow = (rows: any[][], keywords: string[]): number => {
    console.log(`Searching for header with keywords: ${keywords.join(', ')}`);
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const rowString = JSON.stringify(rows[i]);
        // Check if any keyword exists in this row
        if (keywords.some(k => rowString.includes(k))) {
            console.log(`Header found at row ${i}:`, rowString);
            return i;
        }
    }
    console.warn('Header row not found in first 20 rows. Defaulting to index 0.');
    console.log('First row content:', rows[0]);
    return 0; // Default to first row if not found
};

export const processRevenueData = (jsonData: any[]): RevenueData[] => {
    const items = jsonData.map((row) => {
        const rawDate = findValue(row, ['날짜', '일자', 'Date', 'date', 'Day', 'day', '거래일', '승인일']);
        const date = formatDate(rawDate) || 'Unknown Date';

        const getNum = (keys: string[]) => {
            const val = findValue(row, keys);
            return safeParseFloat(val);
        };
        const getString = (keys: string[]) => {
            const val = findValue(row, keys);
            return val ? String(val).trim() : '';
        };

        let revenue = 0;
        let expense = 0;

        // Transaction Amount Column (Should be numeric)
        const amountKeys = ['금액', '합계', 'Amount', 'Total', 'Price', '거래금액', '입금금액', '출금금액', '입금액', '출금액'];
        const singleAmount = getNum(amountKeys);

        // Transaction Type Column (Should be string)
        const typeKeys = ['매출/지출', '구분', 'Type', 'Category', 'Class', 'Kind', 'InOut', '매출구분', '지출구분', '매출/지출구분', '거래처', '항목'];
        const typeStr = getString(typeKeys);

        // 1. Transaction Type Check (Specific keywords)
        if (typeStr && (typeStr.includes('지출') || typeStr.includes('비용') || typeStr.includes('출금') || typeStr.toLowerCase().includes('expense') || typeStr.toLowerCase().includes('output') || typeStr.includes('차변'))) {
            expense = singleAmount;
        }
        else if (typeStr && (typeStr.includes('매출') || typeStr.includes('수입') || typeStr.includes('입금') || typeStr.toLowerCase().includes('revenue') || typeStr.toLowerCase().includes('income') || typeStr.toLowerCase().includes('input') || typeStr.includes('대변'))) {
            revenue = singleAmount;
        }
        // 2. Fallback: Standard Separate Columns or Smart Guessing
        else {
            revenue = getNum(['매출액', 'Revenue', 'Sales', '입금합계', '수입금액', '수입액']);
            expense = getNum(['지출총액', '비용', 'Expense', 'Total Expense', '출금합계', '지출금액', '지출액', '지출합계']);

            if (revenue === 0) revenue = getNum(['매출', '입금액']);
            if (expense === 0) expense = getNum(['지출', '출금액', '출금']);

            if (revenue === 0 && expense === 0 && singleAmount > 0) {
                const rowStr = JSON.stringify(row);
                if (rowStr.includes('매출') || rowStr.includes('수입') || rowStr.includes('입금')) revenue = singleAmount;
                else if (rowStr.includes('지출') || rowStr.includes('비용') || rowStr.includes('출금')) expense = singleAmount;
                else {
                    // If no clear indicator, and we have a 'typeStr' (like '핸디즈'), assume it's revenue if it's a typical sales entry
                    // Most user files for this app are revenue-centric.
                    revenue = singleAmount;
                }
            }
        }

        const fixedCost = getNum(['고정비', '임대료/인건비', 'FixedCost', 'Fixed Cost']);
        const variableCost = getNum(['변동비', '식자재비', 'VariableCost', 'Variable Cost']);
        if (expense === 0 && (fixedCost > 0 || variableCost > 0)) expense = fixedCost + variableCost;

        let profitValue = getNum(['순이익', '영업이익', 'Profit', 'Net Profit']);
        if (profitValue === 0 && (revenue !== 0 || expense !== 0)) profitValue = revenue - expense;

        // Capture 'Partner' or 'Company' as client
        const displayType = getString(['거래처', '공급사', '입점사', 'Vendor', '매출구분', '구분', 'Type']);

        // Capture 'Category' or 'Item' explicitly for filtering
        const categoryStr = getString(['지출구분', '비용구분', '항목', '계정과목', '품명', 'Item', 'Category', 'Classification']);

        // Capture Detailed Memo/Details
        const memoStr = getString(['내역', '적요', '세부내용', 'Details', 'description', 'Memo']);

        // Capture Payment Method
        const paymentMethodStr = getString(['결제수단', '결제방법', '수단', 'PaymentMethod', 'Payment', 'Method']);

        return {
            date,
            revenue,
            expense,
            fixedCost,
            variableCost,
            profit: profitValue,
            client: displayType || '일반',
            category: categoryStr || '',
            memo: memoStr || '',
            paymentMethod: paymentMethodStr || '-'
        };
    }).filter(item => item.revenue !== 0 || item.expense !== 0 || item.fixedCost !== 0 || item.variableCost !== 0 || item.profit !== 0);

    // To prevent breaking current aggregation-based logic everywhere, we sort but don't aggregate yet.
    // The components will handle aggregation as needed.
    return items.sort((a, b) => a.date.localeCompare(b.date));
};

export const parseRevenueData = async (file: File): Promise<RevenueData[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const wb = read(arrayBuffer);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    // Get all data as array of arrays first to find header
    const rawData = utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Find header row looking for specific keywords
    const headerRowIndex = findHeaderRow(rawData, [
        '매출', 'Revenue', '날짜', 'Date', '일자', '금액', '합계'
    ]);
    console.log(`Found revenue header at row ${headerRowIndex}`);

    // Now parse using that header row
    const jsonData = utils.sheet_to_json<any>(ws, { range: headerRowIndex });

    return processRevenueData(jsonData);
};

export const processIngredientData = (jsonData: any[]): IngredientData[] => {
    return jsonData.map((row, index) => {
        const getNum = (keys: string[]) => {
            const val = findValue(row, keys);
            return safeParseFloat(val);
        };

        const unitPrice = getNum(['단가', '가격', 'Price', 'Unit Price', 'cost']);
        const quantity = getNum(['수량', '개수', 'Qty', 'Quantity', 'amount']);
        let totalPrice = getNum(['총액', '합계', '금액', 'Total', 'Total Price', '공급가액', '합계금액']);

        if (totalPrice === 0 && unitPrice > 0 && quantity > 0) {
            totalPrice = unitPrice * quantity;
        }

        const rawDate = findValue(row, ['구매일', '날짜', '일자', 'Date', 'date', '거래일']);
        const name = findValue(row, ['식재료명', '품목', '품명', '자재명', 'Name', 'Item', 'Ingredient', '상품명', '내역', '적요']);

        return {
            id: `ing-${index}-${Date.now()}`,
            name: name || 'Unknown Ingredient',
            unitPrice,
            quantity,
            totalPrice,
            vendor: findValue(row, ['구매처', '거래처', '공급사', 'Vendor', 'Supplier', 'Source']) || '',
            category: findValue(row, ['분류', '카테고리', '구분', 'Category', 'Type', '대분류']) || '기타',
            subCategory: findValue(row, ['소분류', 'Sub Category', 'SubCategory', 'Detail', '세부분류', '상세분류', '품목분류']) || '',
            date: formatDate(rawDate) || new Date().toISOString().split('T')[0]
        };
    }).filter(item => item.totalPrice > 0 || item.quantity > 0 || item.name !== 'Unknown Ingredient');
};

export const parseIngredientData = async (file: File): Promise<IngredientData[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const wb = read(arrayBuffer);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];

    const rawData = utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Find header row looking for specific keywords
    const headerRowIndex = findHeaderRow(rawData, [
        '식재료명', '구매처', '단가', 'Item', 'Vendor', 'Price', '품목', '명칭'
    ]);
    console.log(`Found ingredient header at row ${headerRowIndex}`);

    // Now parse using that header row
    const jsonData = utils.sheet_to_json<any>(ws, { range: headerRowIndex });

    return processIngredientData(jsonData);
};
