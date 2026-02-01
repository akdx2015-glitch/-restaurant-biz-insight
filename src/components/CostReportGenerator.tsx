import { useState, useEffect } from 'react';
import { FileBarChart, Copy, RefreshCw, Calendar, ListFilter, Briefcase } from 'lucide-react';
import type { CostPurchaseData, IngredientData } from '../types';
import {
    filterByMonth,
    filterByDateRange,
    analyzeByCostType,
    analyzePriceTrends,
    analyzeByVendor,
    classifyByCostType,
    convertIngredientToCostPurchase
} from '../utils/costDataParser';

interface CostReportGeneratorProps {
    startDate?: string;
    endDate?: string;
    ingredientData?: IngredientData[];
}

export function CostReportGenerator({ startDate, endDate, ingredientData }: CostReportGeneratorProps) {
    const [costData, setCostData] = useState<CostPurchaseData[]>([]);

    // 외부에서 주입된 ingredientData가 있으면 자동으로 로드
    useEffect(() => {
        if (ingredientData && ingredientData.length > 0) {
            const converted = convertIngredientToCostPurchase(ingredientData);
            setCostData(converted);
        }
    }, [ingredientData]);

    // 기간 표시용 텍스트
    const dateRangeText = startDate && endDate ? `${startDate} ~ ${endDate}` : (startDate ? `${startDate} 이후` : '전체 기간');

    const [report, setReport] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');





    // 기본 보고서 생성
    const generateReport = () => {
        if (!startDate || costData.length === 0) {
            alert('분석할 데이터가 없습니다. 대시보드에서 엑셀 파일을 로드해주세요.');
            return;
        }

        let filtered = [];
        if (endDate) {
            filtered = filterByDateRange(costData, startDate, endDate);
        } else {
            // endDate가 없으면 기존처럼 월별로 처리하거나 전체로 처리해야 하는데,
            // 여기서는 startDate의 '월'로 처리하던 로직을 유지할지, 아니면 startDate 이후 전체로 할지 결정 필요.
            // 사용자 요청은 "기간 조회 적용"이므로, endDate가 있는 경우를 우선 처리.
            // fallback으로 월별 필터 유지
            const targetMonth = startDate.substring(0, 7);
            filtered = filterByMonth(costData, targetMonth);
        }

        // 데이터가 없으면 리포트 초기화
        if (filtered.length === 0) {
            setReport('');
            alert('해당 기간에 데이터가 없습니다.');
            return;
        }

        const analysis = analyzeByCostType(filtered);
        const foodPriceTrends = analyzePriceTrends(analysis.food.items);
        const vendors = analyzeByVendor(filtered);

        // 평균 인상률 계산
        const avgIncreaseRate = foodPriceTrends.length > 0
            ? foodPriceTrends
                .filter(t => t.priceChange > 0)
                .reduce((sum, t) => sum + t.priceChange, 0) /
            Math.max(foodPriceTrends.filter(t => t.priceChange > 0).length, 1)
            : 0;

        const reportText = `## 📄 [코스타푸드] 원가 상세 분석 보고서
기간: ${dateRangeText}

---

### 🍎 PART 1. 식자재 상세 분석 (Food Cost)

**📌 매입 현황**
- 총 매입액: **${analysis.food.totalAmount.toLocaleString()}원**
- 구매 건수: ${analysis.food.count}건
- 평균 구매액: ${analysis.food.count > 0 ? Math.round(analysis.food.totalAmount / analysis.food.count).toLocaleString() : 0}원

**📊 핵심 품목 단가 추이** (변동률 상위 10개)

${foodPriceTrends.length > 0
                ? foodPriceTrends.slice(0, 10).map((item, idx) => {
                    const trend = item.priceChange > 5 ? '🔴 급등' : item.priceChange < -5 ? '🔵 하락' : '🟢 안정';
                    const arrow = item.priceChange > 0 ? '▲' : '▼';
                    return `${idx + 1}. **${item.name}**: ${arrow} ${Math.abs(item.priceChange).toFixed(1)}% ${trend}
   - 현재 단가: ${item.latestPrice.toLocaleString()}원
   - 이전 단가: ${item.previousPrice.toLocaleString()}원
   - 총 구매액: ${item.totalSpent.toLocaleString()}원`;
                }).join('\n\n')
                : '(단가 변동 데이터가 충분하지 않습니다)'
            }

**💰 단가 인상 논리**
- 주요 품목 평균 인상률: **${avgIncreaseRate.toFixed(1)}%**
- 식자재 총액: **${analysis.food.totalAmount.toLocaleString()}원**

${analysis.food.totalAmount > 10000000
                ? `⚠️ **경고**: 식자재 원가가 **1,000만원**을 초과했습니다.
   
**권장사항**: 조식 단가 **1,500원 인상**을 즉시 검토해야 합니다.
- 원가 부담이 과도하게 증가하고 있습니다.
- 주요 품목의 단가 상승률(${avgIncreaseRate.toFixed(1)}%)을 고려할 때 가격 조정이 필요합니다.`
                : `✅ 현재 원가 수준은 적정 범위입니다.
- 지속적인 모니터링을 통해 원가 관리를 유지하세요.`
            }

---

### 🧼 PART 2. 운영용품 상세 분석 (Supply Cost)

**📌 매입 현황**
- 총 매입액: **${analysis.supplies.totalAmount.toLocaleString()}원**
- 구매 건수: ${analysis.supplies.count}건
- 평균 구매액: ${analysis.supplies.count > 0 ? Math.round(analysis.supplies.totalAmount / analysis.supplies.count).toLocaleString() : 0}원

**💡 비용 절감 제언**
1. **고빈도 구매 품목** 대량구매 검토로 단가 협상 가능
2. **소모품 재고 관리** 체계화로 불필요한 중복 구매 방지
3. **거래처 다변화** 검토로 구매 조건 개선

**주요 거래처** (운영용품)
${vendors
                .filter(v => {
                    const vendorSupplies = v.items.filter(item =>
                        item.대분류 === '생활용품' || item.대분류 === '운용용품'
                    );
                    return vendorSupplies.length > 0;
                })
                .slice(0, 5)
                .map((v, idx) => {
                    const suppliesTotal = v.items
                        .filter(item => item.대분류 === '생활용품' || item.대분류 === '운용용품')
                        .reduce((sum, item) => sum + (item['합계금액'] || 0), 0);
                    return `${idx + 1}. ${v.vendor}: ${suppliesTotal.toLocaleString()}원`;
                }).join('\n') || '(해당 거래처 없음)'}

---

### 💡 PART 3. CFO 통합 인사이트

**💳 거래처별 구매 현황** (전체 거래처 상위 5개)
${vendors.slice(0, 5).map((v, idx) =>
                    `${idx + 1}. **${v.vendor}**: ${v.totalAmount.toLocaleString()}원 (${v.itemCount}건)`
                ).join('\n')}

**📈 종합 실행 전략**

**단기 전략 (1개월 이내)**
1. 단가 급등 품목(5% 이상) 대체 공급처 긴급 검토
2. 고빈도 구매 품목 대량 구매 협상 시작
3. 불필요한 운영용품 구매 패턴 분석 및 제거

**중기 전략 (3개월)**
1. 계절별 식자재 구매 전략 수립
2. 주요 거래처와 장기 계약 협상
3. 원가 관리 시스템 정례화 (월 1회 리뷰)

**재무 건전성 지표**
- 식자재 비중: ${((analysis.food.totalAmount / (analysis.food.totalAmount + analysis.supplies.totalAmount + analysis.others.totalAmount)) * 100).toFixed(1)}%
- 운영용품 비중: ${((analysis.supplies.totalAmount / (analysis.food.totalAmount + analysis.supplies.totalAmount + analysis.others.totalAmount)) * 100).toFixed(1)}%
- 총 구매액: **${(analysis.food.totalAmount + analysis.supplies.totalAmount + analysis.others.totalAmount).toLocaleString()}원**

---

**📋 위 보고서 내용을 전체 복사하여 구글 닥스에 붙여넣으세요**

---

*보고서 생성일시: ${new Date().toLocaleString('ko-KR')}*
*데이터 기간: ${dateRangeText}*
*총 데이터 건수: ${filtered.length}건*
`;

        setReport(reportText);
    };

    // 소분류별 가격순 정렬 보고서 생성
    const generateSortedReport = () => {
        if (!startDate || costData.length === 0) {
            alert('분석할 데이터가 없습니다.');
            return;
        }

        let filtered = [];
        if (endDate) {
            filtered = filterByDateRange(costData, startDate, endDate);
        } else {
            const targetMonth = startDate.substring(0, 7);
            filtered = filterByMonth(costData, targetMonth);
        }

        if (filtered.length === 0) {
            setReport('');
            alert('해당 기간에 데이터가 없습니다.');
            return;
        }

        // 1. 식자재만 필터링 및 소분류 그룹화
        const foodItems = filtered.filter(item => classifyByCostType(item) === 'FOOD');
        const supplyItems = filtered.filter(item => classifyByCostType(item) === 'SUPPLY');

        const groupedBySubCategory = foodItems.reduce((acc, item) => {
            const subCategory = item.소분류 || '기타';
            if (!acc[subCategory]) acc[subCategory] = { items: [], totalAmount: 0 };
            acc[subCategory].items.push(item);
            acc[subCategory].totalAmount += (item['합계금액'] || 0);
            return acc;
        }, {} as Record<string, { items: CostPurchaseData[], totalAmount: number }>);

        // 소분류별 총액 기준 내림차순 정렬 (카테고리 순서)
        const sortedCategories = Object.entries(groupedBySubCategory)
            .sort((a: any, b: any) => b[1].totalAmount - a[1].totalAmount);

        // 2. CFO 인사이트 데이터 산출
        const allItems = [...foodItems, ...supplyItems];
        // Top 지출 (금액순)
        const topSpending = [...allItems]
            .sort((a: any, b: any) => (b['합계금액'] || 0) - (a['합계금액'] || 0))
            .slice(0, 3);
        // Top 구매 (수량순)
        const topFrequency = [...allItems]
            .sort((a: any, b: any) => (b.수량 || 0) - (a.수량 || 0)) // 단순 수량 비교
            .slice(0, 3);

        let reportContent = `## 📄 [데이터 분석] 식자재 소분류별 상세 리스트
기간: ${dateRangeText}\n\n`;

        // 테이블 생성 helper
        const createTable = (category: string, items: CostPurchaseData[], categoryTotal: number) => {
            // 항목 병합 로직 (품명 + 규격 기준)
            const mergedItemsMap = items.reduce((acc, item) => {
                const key = `${item.품명}|${item.규격 || ''}`;
                if (!acc[key]) {
                    acc[key] = {
                        ...item,
                        수량: 0,
                        합계금액: 0
                    };
                }
                acc[key].수량 += (item.수량 || 0);
                acc[key]['합계금액'] += (item['합계금액'] || 0);
                return acc;
            }, {} as Record<string, CostPurchaseData>);

            const mergedItems = Object.values(mergedItemsMap);

            // 항목 내 금액순 정렬
            const sortedItems = mergedItems.sort((a: any, b: any) => (b['합계금액'] || 0) - (a['합계금액'] || 0));

            let table = `### 🥩 ${category} (총 ${categoryTotal.toLocaleString()}원)\n`;
            table += `| 품목명 | 규격 | 수량 | 합계금액 | 비중 |\n`;
            table += `| :--- | :--- | :--- | :--- | :--- |\n`;

            sortedItems.forEach(item => {
                const amount = item['합계금액'] || 0;
                const ratio = categoryTotal > 0 ? ((amount / categoryTotal) * 100).toFixed(1) : '0.0';
                table += `| ${item.품명} | ${item.규격 || '-'} | ${item.수량} | ₩${amount.toLocaleString()} | ${ratio}% |\n`;
            });
            table += `\n`;
            return table;
        };

        // 3. 소분류별 섹션 생성
        reportContent += `### 🥩 소분류별 매입 현황 (금액순 정렬)\n\n`;
        sortedCategories.forEach(([category, data]: [any, any]) => {
            reportContent += createTable(category, data.items, data.totalAmount);
        });

        // 4. CFO 비용 인사이트
        reportContent += `### 🔍 CFO 비용 인사이트\n`;

        // TOP 지출
        reportContent += `- **TOP 지출 (Cost Drivers):**\n`;
        topSpending.forEach((item, idx) => {
            reportContent += `  ${idx + 1}. **${item.품명}** (₩${(item['합계금액'] || 0).toLocaleString()}) - 주요 원가 상승 요인\n`;
        });

        // TOP 구매
        reportContent += `- **TOP 구매 (Volume Leaders):**\n`;
        topFrequency.forEach((item, idx) => {
            reportContent += `  ${idx + 1}. **${item.품명}** (${item.수량}개) - 재고 회전율 관리 필요\n`;
        });

        // 운영용품 리스트
        if (supplyItems.length > 0) {
            reportContent += `- **운영용품 분류 (Non-Food):**\n`;
            const supplySummary = supplyItems.reduce((acc, item) => {
                const name = item.품명;
                if (!acc[name]) acc[name] = 0;
                acc[name] += (item['합계금액'] || 0);
                return acc;
            }, {} as Record<string, number>);

            // 금액 높은 운영용품 5개만 표시
            Object.entries(supplySummary)
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([name, amount]) => {
                    reportContent += `  - ${name}: ₩${amount.toLocaleString()} (소모품/운영자재)\n`;
                });
        }

        reportContent += `\n---\n*데이터 기간: ${dateRangeText} | 자동 생성된 보고서입니다.*`;

        setReport(reportContent);
    };

    // 운용용품 상세 분석 보고서 생성
    const generateSupplyReport = () => {
        if (!startDate || costData.length === 0) {
            alert('분석할 데이터가 없습니다.');
            return;
        }

        let filtered = [];
        if (endDate) {
            filtered = filterByDateRange(costData, startDate, endDate);
        } else {
            const targetMonth = startDate.substring(0, 7);
            filtered = filterByMonth(costData, targetMonth);
        }

        if (filtered.length === 0) {
            setReport('');
            alert('해당 기간에 데이터가 없습니다.');
            return;
        }

        // 1. 운용용품/생활용품/비품 추출 (식자재 제외)
        const supplyItems = filtered.filter(item => classifyByCostType(item) !== 'FOOD');

        if (supplyItems.length === 0) {
            alert('선택한 기간에 운용용품/생활용품 데이터가 없습니다.');
            return;
        }

        const groupedBySubCategory = supplyItems.reduce((acc, item) => {
            const subCategory = item.소분류 || item.대분류 || '기타';
            if (!acc[subCategory]) acc[subCategory] = { items: [], totalAmount: 0 };

            // 병합 로직 (품명 + 규격)
            const key = `${item.품명}|${item.규격 || ''}`;
            const existing = acc[subCategory].items.find(i => `${i.품명}|${i.규격 || ''}` === key);

            if (existing) {
                existing.수량 += (item.수량 || 0);
                existing['합계금액'] += (item['합계금액'] || 0);
            } else {
                acc[subCategory].items.push({ ...item });
            }

            acc[subCategory].totalAmount += (item['합계금액'] || 0);
            return acc;
        }, {} as Record<string, { items: CostPurchaseData[], totalAmount: number }>);

        // 합계금액 순 정렬
        const sortedCategories = Object.entries(groupedBySubCategory)
            .sort((a: any, b: any) => b[1].totalAmount - a[1].totalAmount);

        // 고액 지출 품목 (전체 중 Top 5)
        const topExpensiveItems = supplyItems
            .sort((a: any, b: any) => (b['합계금액'] || 0) - (a['합계금액'] || 0))
            .slice(0, 5);

        let reportContent = `## 📑 운용용품 소분류별 지출 상세 (가격순)
기간: ${dateRangeText}\n\n`;

        // 2. 소분류별 테이블 생성
        sortedCategories.forEach(([category, data]: [any, any]) => {
            // 항목 내 금액순 정렬
            const sortedItems = data.items.sort((a: any, b: any) => (b['합계금액'] || 0) - (a['합계금액'] || 0));

            reportContent += `### [${category}]\n`;
            reportContent += `| 품목명 | 수량 | 합계금액 | 분석 의견 |\n`;
            reportContent += `| :--- | :--- | :--- | :--- |\n`;

            sortedItems.forEach(item => {
                const amount = item['합계금액'] || 0;
                // 5만원 이상이거나 전체의 10% 이상이면 주의 표시
                const isHighCost = amount >= 50000;
                const note = isHighCost ? '🔴 고단가 품목 주의' : '-';
                reportContent += `| ${item.품명} | ${item.수량} | ₩${amount.toLocaleString()} | ${note} |\n`;
            });
            reportContent += `\n`;
        });

        // 3. CFO 가이드
        reportContent += `### 💡 CFO의 비용 절감 가이드\n`;
        reportContent += `- **집중 관리 (Top 5 지출):**\n`;
        topExpensiveItems.forEach((item, idx) => {
            reportContent += `  ${idx + 1}. **${item.품명}** (₩${(item['합계금액'] || 0).toLocaleString()}) - 대체 상품 비교 필요\n`;
        });
        reportContent += `- **구매 최적화:**\n`;
        reportContent += `  "잦은 소액 구매보다 분기별 대량 구매가 유리한 품목은 **세제류, 휴지류, 포장용기** 입니다."\n`;
        reportContent += `  "조식 서비스 퀄리티와 직결되지 않는 **불필요한 인테리어 소품** 구매를 자제하십시오."\n`;

        reportContent += `\n---\n*데이터 기간: ${dateRangeText} | 분석 미션: 운용용품 효율화*`;

        setReport(reportContent);
    };

    // 자동 생성 (월 변경 시)
    useEffect(() => {
        if (startDate && costData.length > 0) {
            generateReport();
        } else {
            setReport(''); // 기간이 없거나 데이터가 없으면 리포트 초기화
        }
    }, [startDate, endDate, costData]);

    // 클립보드 복사
    const copyToClipboard = async () => {
        if (!report) {
            alert('먼저 보고서를 생성해주세요.');
            return;
        }

        try {
            await navigator.clipboard.writeText(report);
            alert('보고서가 클립보드에 복사되었습니다!\n구글 닥스에 붙여넣기(Ctrl+V) 하세요.');
        } catch (err) {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin text-blue-500 font-bold text-2xl mb-4">⏳</div>
                    <p className="text-slate-600 font-medium">원가 데이터를 분석하고 있습니다...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 컨트롤 패널 */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/30 rounded-lg">
                            <FileBarChart className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">원가/식자재 상세 분석 보고서</h2>
                            <p className="text-sm text-slate-400">
                                {costData.length > 0
                                    ? `총 ${costData.length}건 데이터 로드됨 | ${startDate ? dateRangeText : '전체 기간'}`
                                    : '분석 데이터를 로드해주세요.'}
                            </p>
                        </div>
                    </div>
                    {/* 버튼 그룹 */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={generateReport}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={16} />
                            기본 보고서
                        </button>

                        <button
                            onClick={generateSortedReport}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ListFilter size={16} />
                            식자재소분류별
                        </button>

                        <button
                            onClick={generateSupplyReport}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Briefcase size={16} />
                            운용용품 분석
                        </button>

                        <button
                            onClick={copyToClipboard}
                            disabled={!report}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <Copy size={16} />
                            복사
                        </button>
                    </div>
                </div>
            </div>

            {/* 보고서 미리보기 */}
            {report && (
                <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800">
                    <div className="prose prose-invert max-w-none">
                        <div style={{ fontFamily: 'inherit' }}>
                            {(() => {
                                const lines = report.split('\n');
                                const blocks: React.ReactNode[] = [];
                                let currentTable: string[] = [];
                                let keyCounter = 0;

                                const flushTable = () => {
                                    if (currentTable.length > 0) {
                                        const headers = currentTable[0]
                                            .split('|')
                                            .map(s => s.trim())
                                            .filter(s => s !== '');

                                        const rows = currentTable.slice(2).map(row =>
                                            row.split('|')
                                                .map(s => s.trim())
                                                .filter((_, idx) => idx > 0 && idx < row.split('|').length - 1)
                                        );

                                        const cleanHeaders = headers;

                                        blocks.push(
                                            <div key={`table-${keyCounter++}`} className="overflow-x-auto my-4 border border-slate-700 rounded-lg">
                                                <table className="w-full text-left border-collapse text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-800 border-b border-slate-700">
                                                            {cleanHeaders.map((h, i) => (
                                                                <th key={i} className="p-2 font-bold text-slate-200 border-r border-slate-700 last:border-r-0 whitespace-nowrap">
                                                                    {h}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((row, rIdx) => (
                                                            <tr key={rIdx} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/50">
                                                                {row.map((cell, cIdx) => (
                                                                    <td key={cIdx} className="p-1.5 text-slate-300 border-r border-slate-800 last:border-r-0">
                                                                        {cell}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                        currentTable = [];
                                    }
                                };

                                lines.forEach((line, idx) => {
                                    const trimmed = line.trim();

                                    if (trimmed.startsWith('|')) {
                                        currentTable.push(trimmed);
                                    } else {
                                        flushTable();

                                        if (line.startsWith('## ')) {
                                            blocks.push(<h2 key={keyCounter++} className="text-2xl font-bold text-white mt-8 mb-4">{line.replace('## ', '')}</h2>);
                                        } else if (line.startsWith('### ')) {
                                            blocks.push(<h3 key={keyCounter++} className="text-xl font-bold text-slate-200 mt-6 mb-3">{line.replace('### ', '')}</h3>);
                                        } else if (line.startsWith('**') && line.endsWith('**')) {
                                            blocks.push(<p key={keyCounter++} className="font-bold text-slate-200 my-2">{line.replace(/\*\*/g, '')}</p>);
                                        } else if (line.startsWith('---')) {
                                            blocks.push(<hr key={keyCounter++} className="my-6 border-slate-700" />);
                                        } else if (trimmed === '') {
                                            blocks.push(<div key={keyCounter++} className="h-2"></div>);
                                        } else {
                                            const parts = line.split(/(\*\*[^*]+\*\*)/g);
                                            blocks.push(
                                                <p key={keyCounter++} className="my-1 text-slate-300 text-sm leading-relaxed">
                                                    {parts.map((part, i) => {
                                                        if (part.startsWith('**') && part.endsWith('**')) {
                                                            return <strong key={i} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
                                                        }
                                                        return part;
                                                    })}
                                                </p>
                                            );
                                        }
                                    }
                                });
                                flushTable();

                                return blocks;
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


