import type { RevenueData } from '../types';

export const CATEGORY_RULES = {
    FIXED: {
        '임대료/관리비': ['임대', '월세', '관리비', '보증금', '부동산', 'Rent', 'Space'],
        '세금/보험': ['세금', '국세', '지방세', '보험', '부가세', 'Tax', 'Insurance'],
        '통신비': ['통신', '인터넷', '전화', 'KT', 'LG', 'SK', '유플러스'],
        '용역/관리': ['세스코', '보안', '경비', '캡스', '정수기', '렌탈', '청소', 'Service'],
        '금융/기타': ['이자', '대출', '상환', '카드대금', '협회', '회비', '고정', '감가상각']
    },
    VARIABLE: {
        '식자재': ['식자재', '농산', '축산', '수산', '유통', '푸드', '청과', '미트', '웰스토리', '프레시', '마트', '시장', '상회', '고기', '쌀', '야채', 'Food', 'Meat', 'Rice', '식품'],
        '주류/음료': ['주류', '주사', '음료', '하이트', '오비', '칠성', '코카', '와인', 'Liquor', 'Beer'],
        '인건비': ['급여', '인건비', '알바', '아르바이트', '월급', '직원', '매니저', '스탭', 'Part', 'Salary', 'Payroll', 'Wages'],
        '수도광열비': ['수도', '가스', '전기', '한전', '삼천리', '예스코', '도시가스', 'Utility', 'Gas', 'Electric'],
        '운영용품': ['쿠팡', '다이소', '비닐', '포장', '용기', '배민상회', '소모품', '잡화', '네이버', 'Supplies', '생활'],
        '배달/수수료': ['배민', '요기요', '토스', '카드', '수수료', '퀵', '라이더', '부릉', '바로고', 'Delivery', 'Fee'],
        '마케팅': ['광고', '홍보', '마케팅', '인스타', '페이스북', '블로그', 'Marketing', 'Ads']
    }
};

export const findCategory = (name: string, rules: Record<string, string[]>) => {
    for (const [catName, keywords] of Object.entries(rules)) {
        if (keywords.some(k => name.includes(k))) return catName;
    }
    return null;
};

export const getCostType = (d: RevenueData) => {
    const rawName = d.client || '';
    const rawCat = (d as any).category || '';
    const searchStr = `${rawCat} ${rawName}`;
    const isExplicitFixed = rawCat.includes('고정비') || rawCat.includes('Fixed');
    const isExplicitVariable = rawCat.includes('변동비') || rawCat.includes('Variable');

    let cleanedName = rawCat || rawName || '기타';
    cleanedName = cleanedName.replace(/\(고정비\)/g, '').replace(/\(변동비\)/g, '').trim();

    if (isExplicitFixed) return { type: 'FIXED', category: cleanedName };
    if (isExplicitVariable) return { type: 'VARIABLE', category: cleanedName };

    const fixedCat = findCategory(searchStr, CATEGORY_RULES.FIXED);
    if (fixedCat) return { type: 'FIXED', category: fixedCat };

    const variableCat = findCategory(searchStr, CATEGORY_RULES.VARIABLE);
    if (variableCat) return { type: 'VARIABLE', category: variableCat };

    let fallbackName = rawCat || rawName || '기타';
    fallbackName = fallbackName.replace(/\(변동비\)/g, '').replace(/\(고정비\)/g, '').trim();
    if (!fallbackName) fallbackName = '기타 변동비';

    return { type: 'VARIABLE', category: fallbackName };
};
