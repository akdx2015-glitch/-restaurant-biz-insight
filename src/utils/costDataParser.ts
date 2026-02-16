import * as XLSX from 'xlsx';
import type { CostPurchaseData, IngredientData } from '../types';

/**
 * Excel 파일에서 원가 데이터 파싱
 */
export const parseCostDataFromFile = (file: File): Promise<CostPurchaseData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawData = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[];

                // 데이터 정제
                const jsonData: CostPurchaseData[] = rawData.map((item: any) => {
                    const itemName = item['품명'] || item['품목명'] || item['상품명'] || item['품목'] || item['상품'] || '이름 없음';
                    const vendor = item['거래처'] || item['거래처명'] || item['매입처'] || '기타';
                    const spec = item['규격'] || item['단위규격'] || '';
                    const unit = item['단위'] || '';

                    // 금액 필드 처리 (콤마 제거)
                    const parseNum = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
                        return 0;
                    };

                    return {
                        ...item,
                        품명: itemName,
                        거래처: vendor,
                        규격: spec,
                        단위: unit,
                        합계금액: parseNum(item['합계금액'] || item['금액'] || item['공급가액'] || item['합계']),
                        단가: parseNum(item['단가'] || item['단가(VAT포함)'] || 0),
                        공급가: parseNum(item['공급가'] || item['공급가액'] || 0),
                        부가세: parseNum(item['부가세'] || item['세액'] || 0),
                        수량: parseNum(item['수량'] || 0),
                    };
                });

                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * 고정 Excel 파일 로드 (public 폴더에서)
 */
export const loadCostMasterData = async (): Promise<CostPurchaseData[]> => {
    try {
        const response = await fetch('/cost_data.xlsx');
        const contentType = response.headers.get('content-type');

        if (!response.ok) {
            throw new Error(`파일을 불러올 수 없습니다: ${response.statusText}`);
        }

        if (contentType && contentType.includes('text/html')) {
            throw new Error('엑셀 파일 대신 HTML이 반환되었습니다. 서버 재시작이 필요할 수 있습니다.');
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // raw: false 옵션을 사용하여 날짜가 숫자가 아닌 문자열(보이는 그대로)로 파싱되도록 함
        const rawData = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[];

        // 데이터 정제: 문자열로 파싱된 숫자를 실제 숫자로 변환
        const jsonData: CostPurchaseData[] = rawData.map((item: any) => {
            const itemName = item['품명'] || item['품목명'] || item['상품명'] || item['품목'] || item['상품'] || '이름 없음';
            const vendor = item['거래처'] || item['거래처명'] || item['매입처'] || '기타';
            const spec = item['규격'] || item['단위규격'] || '';
            const unit = item['단위'] || '';

            // 금액 필드 처리 (콤마 제거)
            const parseNum = (val: any) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
                return 0;
            };

            return {
                ...item,
                품명: itemName,
                거래처: vendor,
                규격: spec,
                단위: unit,
                합계금액: parseNum(item['합계금액'] || item['금액'] || item['공급가액'] || item['합계']),
                단가: parseNum(item['단가'] || item['단가(VAT포함)'] || 0),
                공급가: parseNum(item['공급가'] || item['공급가액'] || 0),
                부가세: parseNum(item['부가세'] || item['세액'] || 0),
                수량: parseNum(item['수량'] || 0),
            };
        });

        return jsonData;
    } catch (error) {
        console.error('원가 데이터 로드 실패:', error);
        return [];
    }
};

/**
 * 월별 필터링
 */
export const filterByMonth = (data: CostPurchaseData[], month: string): CostPurchaseData[] => {
    return data.filter(item => item.월 === month || item.날짜?.startsWith(month));
};

/**
 * 기간별 필터링 (Start ~ End)
 */
export const filterByDateRange = (data: CostPurchaseData[], startDate: string, endDate: string): CostPurchaseData[] => {
    if (!startDate || !endDate) return data;
    return data.filter(item => {
        const date = item.날짜 || '';
        if (!date) return false;
        return date >= startDate && date <= endDate;
    });
};

/**
 * 식자재 vs 운영용품 분류
 */
export const classifyByCostType = (item: CostPurchaseData): 'FOOD' | 'SUPPLY' | 'OTHER' => {
    const category = item.대분류;

    if (category === '식자재') {
        return 'FOOD';
    }

    if (category === '생활용품' || category === '운용용품') {
        return 'SUPPLY';
    }

    if (category === '시설투자') {
        return 'OTHER';
    }

    return 'OTHER';
};

/**
 * 데이터 분석: 식자재 vs 운영용품
 */
export const analyzeByCostType = (data: CostPurchaseData[]) => {
    const food = data.filter(r => classifyByCostType(r) === 'FOOD');
    const supplies = data.filter(r => classifyByCostType(r) === 'SUPPLY');
    const others = data.filter(r => classifyByCostType(r) === 'OTHER');

    return {
        food: {
            items: food,
            totalAmount: food.reduce((sum, r) => sum + (r.합계금액 || 0), 0),
            count: food.length,
        },
        supplies: {
            items: supplies,
            totalAmount: supplies.reduce((sum, r) => sum + (r.합계금액 || 0), 0),
            count: supplies.length,
        },
        others: {
            items: others,
            totalAmount: others.reduce((sum, r) => sum + (r.합계금액 || 0), 0),
            count: others.length,
        },
    };
};

/**
 * 품목별 단가 추이 분석
 */
export const analyzePriceTrends = (data: CostPurchaseData[]) => {
    // 품명별로 그룹화
    const grouped = data.reduce((acc, item) => {
        if (!item.품명) return acc; // 품명이 없는 데이터는 제외
        const key = item.품명;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, CostPurchaseData[]>);

    // 각 품목의 단가 변화 계산
    return Object.entries(grouped)
        .map(([name, items]) => {
            const sorted = items.sort((a: any, b: any) => {
                const dateA = new Date(a.날짜 || '2024-01-01').getTime();
                const dateB = new Date(b.날짜 || '2024-01-01').getTime();
                return dateA - dateB;
            });

            const latest = sorted[sorted.length - 1];
            const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

            const priceChange = previous && previous.단가
                ? ((latest.단가 - previous.단가) / previous.단가) * 100
                : 0;

            return {
                name,
                latestPrice: latest.단가 || 0,
                previousPrice: previous?.단가 || 0,
                priceChange,
                purchaseCount: items.length,
                totalSpent: items.reduce((sum, i) => sum + (i.합계금액 || 0), 0),
                latestDate: latest.날짜,
            };
        })
        .filter(item => item.purchaseCount > 1) // 2회 이상 구매한 품목만
        .sort((a: any, b: any) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
};

/**
 * 거래처별 집계
 */
export const analyzeByVendor = (data: CostPurchaseData[]) => {
    const byVendor = data.reduce((acc, item) => {
        const vendor = item.거래처 || '기타';
        if (!acc[vendor]) {
            acc[vendor] = { totalAmount: 0, items: [] };
        }
        acc[vendor].totalAmount += item.합계금액 || 0;
        acc[vendor].items.push(item);
        return acc;
    }, {} as Record<string, { totalAmount: number; items: CostPurchaseData[] }>);

    return Object.entries(byVendor)
        .map(([vendor, data]) => ({
            vendor,
            totalAmount: data.totalAmount,
            itemCount: data.items.length,
            items: data.items
        }))
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount);
};

/**
 * 월별 가용 데이터 목록 추출
 */
export const getAvailableMonths = (data: CostPurchaseData[]): string[] => {
    const months = new Set<string>();
    data.forEach(item => {
        if (item.월) {
            months.add(item.월);
        } else if (item.날짜) {
            const month = item.날짜.substring(0, 7); // YYYY-MM
            months.add(month);
        }
    });
    return Array.from(months).sort();
};
/**
 * IngredientData를 CostPurchaseData로 변환 (통합 분석용)
 */
export const convertIngredientToCostPurchase = (data: IngredientData[]): CostPurchaseData[] => {
    return data.map(item => {
        let majorCategory: '식자재' | '생활용품' | '운용용품' | '반려동물' | '기타' | '차량용품' | '시설투자' = '식자재';

        // 카테고리 매핑 (개선됨: 품명 + 카테고리 모두 검색)
        const category = item.category || '';
        const name = item.name || '';

        // 검색 대상 문자열 (카테고리 + 품명 + 소분류)
        const subCategory = item.subCategory || '';
        const targetString = `${category} ${name} ${subCategory}`;

        // 1. 명시적 카테고리/소분류 확인
        if (category === '시설투자' || subCategory === '시설투자' || name.includes('시설') || name.includes('공사') || name.includes('인테리어') || name.includes('설비')) {
            majorCategory = '시설투자';
        } else if (category === '운용용품' || subCategory === '운용용품' || category === '소모품' || subCategory === '소모품') {
            majorCategory = '운용용품';
        } else if (category === '식자재' || subCategory === '식자재') {
            majorCategory = '식자재';
        } else {
            // 2. 키워드 기반 분류
            const foodKeywords = [
                '육류', '소고기', '돼지고기', '닭고기', '채소', '야채', '과일', '식용유', '소스',
                '파우더', '가루', '면', '쌀', '김치', '해산물', '생선', '냉동', '유제품', '우유',
                '치즈', '계란', '음료', '주류', '커피', '원두', '빵', '베이커리', '밀가루', '설탕',
                '소금', '조미료', '양념', '육수', '토핑', '시럽', '퓨레', '농축액', '파스타', '떡'
            ];

            const supplyKeywords = [
                '공산품', '생활용품', '소모품', '주방용품', '잡화', '비품', '포장', '용기',
                '세제', '위생', '타올', '티슈', '휴지', '장갑', '봉투', '호일', '랩',
                '수세미', '부탄', '가스', '세정', '락스', '행주', '컵', '빨대', '캐리어',
                '홀더', '유산지', '이쑤시개', '철수세미', '마스크', '앞치마', '세탁',
                '린스', '샴푸', '비누', '치약', '칫솔', '테이프', '일회용', '종이', '플라스틱'
            ];

            if (foodKeywords.some(k => targetString.includes(k))) {
                majorCategory = '식자재';
            } else if (supplyKeywords.some(k => targetString.includes(k))) {
                majorCategory = '운용용품';
            } else if (category === '기타') {
                majorCategory = '기타';
            } else {
                // 키워드에도 없고 기타도 아니면 기본값 식자재 (가장 흔함)
                majorCategory = '식자재';
            }
        }

        return {
            월: item.date ? item.date.substring(0, 7) : '',
            날짜: item.date,
            거래처: item.vendor || '기타',
            대분류: majorCategory,
            중분류: item.category, // 원래 카테고리를 중분류로 활용
            소분류: item.subCategory || item.category, // 소분류가 있으면 우선 사용
            품명: item.name,
            규격: 'N/A', // 정보 없음
            수량: item.quantity,
            단위: '개',  // 기본값
            단가: item.unitPrice,
            공급가: Math.round(item.totalPrice / 1.1),
            부가세: item.totalPrice - Math.round(item.totalPrice / 1.1),
            합계금액: item.totalPrice,
            결제수단: '카드'
        };
    });
};
