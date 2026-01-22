import type { RevenueData, IngredientData } from '../types';

export const SAMPLE_REVENUE_DATA: RevenueData[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(2025, 6, i + 1).toISOString().split('T')[0];
    const revenue = Math.floor(Math.random() * (1500000 - 800000) + 800000);
    const fixedCost = 300000;
    const variableCost = Math.floor(revenue * (Math.random() * (0.45 - 0.35) + 0.35));
    const expense = fixedCost + variableCost;
    const profit = revenue - expense;

    const categories = ['핸디즈', 'A호텔', 'B호텔', '배민', '쿠팡', '워크인'];
    const client = categories[Math.floor(Math.random() * categories.length)];

    return {
        date,
        revenue,
        expense,
        fixedCost,
        variableCost,
        profit,
        client
    };
});

export const SAMPLE_INGREDIENT_DATA: IngredientData[] = [
    { id: '1', name: '양파', unitPrice: 1500, quantity: 50, totalPrice: 75000, vendor: '대박농산', category: '채소', date: '2024-01-02' },
    { id: '2', name: '소고기 등심', unitPrice: 25000, quantity: 10, totalPrice: 250000, vendor: '미트박스', category: '육류', date: '2024-01-02' },
    { id: '3', name: '파스타면', unitPrice: 3000, quantity: 20, totalPrice: 60000, vendor: '식자재왕', category: '공산품', date: '2024-01-03' },
    { id: '4', name: '토마토 소스', unitPrice: 5000, quantity: 15, totalPrice: 75000, vendor: '식자재왕', category: '공산품', date: '2024-01-03' },
    { id: '5', name: '양상추', unitPrice: 2000, quantity: 30, totalPrice: 60000, vendor: '대박농산', category: '채소', date: '2024-01-05' },
    { id: '6', name: '삼겹살', unitPrice: 15000, quantity: 20, totalPrice: 300000, vendor: '미트박스', category: '육류', date: '2024-01-05' },
    { id: '7', name: '계란', unitPrice: 300, quantity: 300, totalPrice: 90000, vendor: '알찬농장', category: '채소', date: '2024-01-07' },
    { id: '8', name: '치즈', unitPrice: 12000, quantity: 5, totalPrice: 60000, vendor: '유제품나라', category: '공산품', date: '2024-01-08' },
    { id: '9', name: '와인', unitPrice: 15000, quantity: 10, totalPrice: 150000, vendor: '와인코리아', category: '주류/음료', date: '2024-01-10' },
    { id: '10', name: '쌀', unitPrice: 50000, quantity: 4, totalPrice: 200000, vendor: '이천쌀', category: '공산품', date: '2024-01-12' },
];
