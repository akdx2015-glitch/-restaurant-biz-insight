export interface RevenueData {
    date: string;
    revenue: number;
    expense: number;
    fixedCost: number; // 월세, 인건비 등 (고정비)
    variableCost: number; // 식자재 등 (변동비)
    profit: number;
    client?: string; // 매출구분 또는 거래처
    category?: string; // 지출구분, 항목, 내역 등 (e.g. "인건비", "식자재")
    memo?: string; // 적요
    paymentMethod?: string; // 결제수단
}

export interface IngredientData {
    id: string;
    name: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    vendor: string;
    category: '채소' | '육류' | '해산물' | '공산품' | '주류/음료' | '기타';
    date: string;
}

export interface DashboardStats {
    totalRevenue: number;
    totalExpense: number;
    operatingProfit: number;
    profitMargin: number;
}

export interface CostPurchaseData {
    월: string;              // "2024-01"
    날짜: string;            // "2024-01-15"
    거래처: string;          // "쿠팡(주)", "웰스토리" 등
    대분류: '식자재' | '생활용품' | '운용용품' | '반려동물' | '기타' | '차량용품';
    중분류?: string;         // 세부 카테고리
    소분류?: string;         // 더 세부적인 카테고리
    품명: string;            // 상품명
    규격: string;            // "1kg", "500ml" 등
    수량: number;
    단위: string;            // "개", "박스" 등
    단가: number;
    공급가: number;
    부가세: number;
    합계금액: number;
    결제수단: string;
}

