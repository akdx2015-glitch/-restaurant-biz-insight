import { useState, useMemo, useEffect } from 'react';
import { X, Copy, FileText, Check, GripVertical } from 'lucide-react';
import type { RevenueData, IngredientData } from '../types';
import { getCostType } from '../utils/costUtils';

interface CFOReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    revenueData: RevenueData[];
    ingredientData: IngredientData[];
    startDate: string;
    endDate: string;
}

export function CFOReportModal({ isOpen, onClose, revenueData, ingredientData, startDate, endDate }: CFOReportModalProps) {
    const [headcount, setHeadcount] = useState<number>(5); // Default headcount
    const [copied, setCopied] = useState(false);

    // Reset copied state when modal opens
    useEffect(() => {
        if (isOpen) setCopied(false);
    }, [isOpen]);

    const { reportInfo, reportMarkdown } = useMemo(() => {
        if (!isOpen) return { reportInfo: null, reportMarkdown: '' };

        // 1. Calculate Financials
        const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);

        // Filter expenses
        const expenses = revenueData.filter(d => d.expense > 0);

        // Categorize expenses
        let foodCost = 0;
        let laborCost = 0;
        let utilityCost = 0; // 수도광열비 (Prime Cost calculation)
        let fixedCost = 0;
        let variableCost = 0;
        let suppliesCost = 0; // Operation supplies (비용 누수 탐지)

        expenses.forEach(item => {
            const { type, category } = getCostType(item);
            const amount = item.expense;

            if (type === 'FIXED') {
                fixedCost += amount;
            } else {
                variableCost += amount;
            }

            if (category.includes('식자재') || category.includes('Food') || category.includes('Meat')) {
                foodCost += amount;
            }
            if (category.includes('인건비') || category.includes('Salary') || category.includes('Wages') || category.includes('급여')) {
                laborCost += amount;
            }
            if (category.includes('수도') || category.includes('가스') || category.includes('전기') || category.includes('광열')) {
                utilityCost += amount;
            }
            if (category.includes('운영용품') || category.includes('소모품') || category.includes('잡화')) {
                suppliesCost += amount;
            }
        });

        // Fallback for Food Cost
        if (foodCost === 0 && ingredientData.length > 0) {
            const ingredientSum = ingredientData.reduce((acc, curr) => acc + curr.totalPrice, 0);
            if (ingredientSum > 0) {
                foodCost = ingredientSum;
                variableCost += ingredientSum;
            }
        }

        // Metrics Calculation
        const flCost = foodCost + laborCost;
        const flRatio = totalRevenue > 0 ? (flCost / totalRevenue) * 100 : 0;

        const primeCost = flCost + utilityCost;

        // BEP Calculation
        const margin = totalRevenue - variableCost;
        const cmRatio = totalRevenue > 0 ? margin / totalRevenue : 0;
        const bep = (cmRatio > 0 && fixedCost > 0) ? fixedCost / cmRatio : 0;
        const bepReached = totalRevenue >= bep ? '달성' : '미달';

        const revPerHead = headcount > 0 ? totalRevenue / headcount : 0;

        // Status Indicators
        const flStatus = flRatio <= 65 ? '🟢' : (flRatio <= 70 ? '🟡' : '🔴');
        const overallStatus = (flRatio <= 65 && bepReached === '달성') ? '🟢 양호' : (flRatio > 70 ? '🔴 위험' : '🟡 주의');

        // Helper for formatting currency
        const fmt = (n: number) => Math.round(n).toLocaleString();

        // 1. Defintions & Basis Strings
        const flDef = "식자재와 인건비가 차지하는 비중 (낮을수록 이익 높음)";
        const flBasis = `(식자재 ${fmt(foodCost)} + 인건비 ${fmt(laborCost)}) ÷ 매출 ${fmt(totalRevenue)}`;

        const primeDef = "상품 판매를 위해 소요된 직접적인 총 비용";
        const primeBasis = `FL비용 ${fmt(flCost)} + 수도광열비 등 ${fmt(utilityCost)}`;

        const bepDef = "이익도 손해도 아닌 '본전'이 되는 매출액";
        const bepBasis = `고정비 ${fmt(fixedCost)} ÷ 공헌이익률 ${(cmRatio * 100).toFixed(1)}%`;

        const prodDef = "직원 1명당 창출하는 매출액 (효율성 지표)";
        const prodBasis = `총 매출 ${fmt(totalRevenue)} ÷ 근무 인원 ${headcount}명`;

        // Date Range
        const dateRangeText = endDate
            ? `${startDate} ~ ${endDate}`
            : `${startDate.substring(0, 4)}년 ${startDate.substring(5, 7)}월`;

        const markdown = `## 📄 [코스타푸드] 월간 핵심 경영지표 보고서
**분석 기간:** ${dateRangeText}

### 🚦 1. 종합 재무 신호등
- **현재 등급:** ${overallStatus}
- **CFO 한줄평:** "${flRatio > 65
                ? "FL Cost(식자재+인건비) 비중이 높아 수익성이 저하되고 있습니다. 식자재 로스 관리와 인력 운영 효율화가 시급합니다."
                : "전반적인 비용 관리가 양호하게 이루어지고 있습니다. 현재의 효율성을 유지하며 매출 증대 전략에 집중하십시오."}"

### 📈 2. 4대 경영 지표 현황 (상세)
| 지표명 (의미) | 분석 결과 (산출 근거) | 목표 | 상태 |
| :--- | :--- | :--- | :--- |
| **FL Cost**<br>_${flDef}_ | **${flRatio.toFixed(1)}%**<br>_${flBasis}_ | 65% 이하 | ${flStatus} |
| **Prime Cost**<br>_${primeDef}_ | **${primeCost.toLocaleString()}원**<br>_${primeBasis}_ | - | 점검필요 |
| **손익분기점(BEP)**<br>_${bepDef}_ | **${Math.round(bep).toLocaleString()}원**<br>_${bepBasis}_ | 달성 여부 | ${bepReached} |
| **인당 생산성**<br>_${prodDef}_ | **${Math.round(revPerHead).toLocaleString()}원**<br>_${prodBasis}_ | - | ${revPerHead > 5000000 ? '효율적' : '비효율'} |

### 🔍 3. 상세 분석 및 누수 탐지
- **비용 누수:** 식자재 외 불필요한 운영용품 지출 내역 (약 ${suppliesCost.toLocaleString()}원)
- **생산성 리포트:** 매출액 대비 인건비 비중 ${(totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0).toFixed(1)}% (적정 수준: 20~25%)

### 💡 4. CFO의 전략적 Action Plan
- **단가 협상:** "Prime Cost 상승분을 근거로 주요 메뉴/서비스 단가 인상 추진 검토 요망"
- **운영 최적화:** 식자재 폐기율 1% 감소 및 피크타임 인력 재배치를 통한 생산성 향상`;

        return {
            reportMarkdown: markdown,
            reportInfo: {
                dateRangeText,
                overallStatus,
                flRatio,
                flStatus,
                primeCost,
                bep,
                bepReached,
                revPerHead,
                totalRevenue,
                laborCost,
                suppliesCost,

                // Extra UI data
                flDef, flBasis,
                primeDef, primeBasis,
                bepDef, bepBasis,
                prodDef, prodBasis
            }
        };
    }, [isOpen, revenueData, ingredientData, headcount, startDate, endDate]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(reportMarkdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
            alert('복사에 실패했습니다.');
        }
    };

    if (!isOpen || !reportInfo) return null;
    const {
        dateRangeText, overallStatus, flRatio, flStatus, primeCost, bep, bepReached, revPerHead,
        totalRevenue, laborCost, suppliesCost,
        flDef, flBasis, primeDef, primeBasis, bepDef, bepBasis, prodDef, prodBasis
    } = reportInfo;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#F8F9FA] rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">

                {/* Google Docs Style Toolbar */}
                <div className="bg-white border-b border-[#E0E0E0] px-4 py-3 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-[#4285F4] rounded text-white">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-[#202124]">CFO 핵심 경영 보고서</h2>
                            <div className="flex items-center gap-2 text-xs text-[#5F6368]">
                                <span>파일</span>
                                <span>수정</span>
                                <span>보기</span>
                                <span>입력</span>
                                <span>서식</span>
                                <span className="text-[#9AA0A6] ml-2">자동 저장됨</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#E8F0FE] text-[#1967D2] px-3 py-1.5 rounded hover:bg-[#D2E3FC] transition-colors cursor-pointer border border-transparent hover:border-[#D2E3FC]">
                            <label className="text-xs font-semibold whitespace-nowrap">근무 인원:</label>
                            <input
                                type="number"
                                value={headcount}
                                onChange={(e) => setHeadcount(Number(e.target.value))}
                                className="w-12 bg-transparent text-center font-bold text-sm focus:outline-none border-b border-[#1967D2]"
                                min="1"
                            />
                            <span className="text-xs">명</span>
                        </div>

                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all text-white shadow-sm ${copied ? 'bg-[#34A853] hover:bg-[#2D9144]' : 'bg-[#1A73E8] hover:bg-[#1557B0]'
                                }`}
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? '복사됨' : '복사하기'}
                        </button>

                        <button onClick={onClose} className="p-2 hover:bg-[#F1F3F4] rounded-full text-[#5F6368] transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Document Viewer (A4 Paper Style) */}
                <div className="flex-1 overflow-y-auto bg-[#F0F2F5] p-8 flex flex-col items-center gap-6">

                    {/* PAGE 1 */}
                    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-[0_2px_12px_rgba(0,0,0,0.1)] py-[20mm] px-[20mm] text-[#353744] selection:bg-[#BBD6FC] flex flex-col">
                        {/* Report Header */}
                        <div className="border-b-2 border-slate-800 pb-4 mb-8">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">📄 [코스타푸드] 월간 핵심 경영지표 보고서</h1>
                            <p className="text-slate-600 font-medium">분석 기간: <span className="text-slate-900">{dateRangeText}</span></p>
                        </div>

                        {/* Section 1: Signal Light */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🚦</span> 1. 종합 재무 신호등
                            </h3>
                            <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-900 shadow-sm">
                                <p className="mb-2 text-lg">
                                    <span className="font-bold">현재 등급:</span> <span className={`font-bold ${overallStatus.includes('위험') ? 'text-red-600' : overallStatus.includes('주의') ? 'text-orange-500' : 'text-green-600'}`}>{overallStatus}</span>
                                </p>
                                <div className="flex gap-2">
                                    <span className="font-bold shrink-0">CFO 한줄평:</span>
                                    <blockquote className="italic text-slate-700 bg-white px-2 rounded">
                                        "{flRatio > 65
                                            ? "FL Cost(식자재+인건비) 비중이 높아 수익성이 저하되고 있습니다. 식자재 로스 관리와 인력 운영 효율화가 시급합니다."
                                            : "전반적인 비용 관리가 양호하게 이루어지고 있습니다. 현재의 효율성을 유지하며 매출 증대 전략에 집중하십시오."}"
                                    </blockquote>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: 4 Key Metrics Table */}
                        <div className="mb-8 flex-1">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-2xl">📈</span> 2. 4대 경영 지표 현황
                            </h3>
                            <div className="overflow-hidden border border-slate-300 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                                        <tr>
                                            <th className="px-6 py-3 w-[30%]">지표명 (의미)</th>
                                            <th className="px-6 py-3 w-[40%]">분석 결과 (산출 근거)</th>
                                            <th className="px-6 py-3 w-[15%]">목표</th>
                                            <th className="px-6 py-3 w-[15%]">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {/* FL Cost */}
                                        <tr className="hover:bg-slate-50">
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-900">FL Cost</span>
                                                <span className="block text-xs text-slate-500 mt-1 leading-tight">{flDef}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-800">{flRatio.toFixed(1)}%</span>
                                                <span className="block text-xs text-slate-500 mt-1 font-mono">{flBasis}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top text-slate-600 font-medium pt-5">65% 이하</td>
                                            <td className="px-6 py-4 align-top pt-5">{flStatus}</td>
                                        </tr>

                                        {/* Prime Cost */}
                                        <tr className="hover:bg-slate-50">
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-900">Prime Cost</span>
                                                <span className="block text-xs text-slate-500 mt-1 leading-tight">{primeDef}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-800">{primeCost.toLocaleString()}원</span>
                                                <span className="block text-xs text-slate-500 mt-1 font-mono">{primeBasis}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top text-slate-600 font-medium pt-5">-</td>
                                            <td className="px-6 py-4 align-top pt-5 text-orange-600 font-medium">점검필요</td>
                                        </tr>

                                        {/* BEP */}
                                        <tr className="hover:bg-slate-50">
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-900">손익분기점(BEP)</span>
                                                <span className="block text-xs text-slate-500 mt-1 leading-tight">{bepDef}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-800">{Math.round(bep).toLocaleString()}원</span>
                                                <span className="block text-xs text-slate-500 mt-1 font-mono">{bepBasis}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top text-slate-600 font-medium pt-5">달성 여부</td>
                                            <td className={`px-6 py-4 align-top pt-5 font-bold ${bepReached === '달성' ? 'text-blue-600' : 'text-red-500'}`}>{bepReached}</td>
                                        </tr>

                                        {/* Productivity */}
                                        <tr className="hover:bg-slate-50">
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-900">인당 생산성</span>
                                                <span className="block text-xs text-slate-500 mt-1 leading-tight">{prodDef}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className="block font-bold text-base text-slate-800">{Math.round(revPerHead).toLocaleString()}원</span>
                                                <span className="block text-xs text-slate-500 mt-1 font-mono">{prodBasis}</span>
                                            </td>
                                            <td className="px-6 py-4 align-top text-slate-600 font-medium pt-5">-</td>
                                            <td className={`px-6 py-4 align-top pt-5 font-bold ${revPerHead > 5000000 ? 'text-blue-600' : 'text-slate-500'}`}>{revPerHead > 5000000 ? '효율적' : '비효율'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* PAGE 2 */}
                    <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-[0_2px_12px_rgba(0,0,0,0.1)] py-[20mm] px-[20mm] text-[#353744] selection:bg-[#BBD6FC]">
                        {/* Section 3: Detailed Analysis */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🔍</span> 3. 상세 분석 및 누수 탐지
                            </h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-700 leading-relaxed block bg-slate-50 p-6 rounded-lg border border-slate-200">
                                <li className="mb-2">
                                    <strong className="text-slate-900">비용 누수:</strong> 식자재 외 불필요한 운영용품 지출 내역을 분석했습니다.
                                    <br />
                                    <span className="text-sm text-slate-600 pl-2">- 누수 추정액: 약 <span className="font-mono bg-yellow-100 px-1 rounded font-bold text-slate-800">{suppliesCost.toLocaleString()}원</span></span>
                                </li>
                                <li>
                                    <strong className="text-slate-900">생산성 리포트:</strong> 매출액 대비 인건비 비중을 분석했습니다.
                                    <br />
                                    <span className="text-sm text-slate-600 pl-2">- 현재 비율: <span className="font-mono bg-blue-50 px-1 rounded font-bold text-slate-800">{(totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0).toFixed(1)}%</span> (적정 수준: 20~25%)</span>
                                </li>
                            </ul>
                        </div>

                        {/* Section 4: Action Plan */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-2xl">💡</span> 4. CFO의 전략적 Action Plan
                            </h3>
                            <div className="space-y-6">
                                <div className="flex gap-4 items-start bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                                    <div className="min-w-[4px] h-12 bg-blue-500 rounded-full mt-1"></div>
                                    <div>
                                        <span className="font-bold text-lg text-slate-900 block mb-2">단가 협상 및 메뉴 가격 정책</span>
                                        <p className="text-slate-700 leading-relaxed bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                                            "Prime Cost(식자재+인건비+제조경비) 상승분을 근거로, 이익률 방어를 위해 주요 메뉴 및 서비스의 단가 인상을 적극적으로 검토해야 할 시점입니다."
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start bg-green-50/50 p-5 rounded-xl border border-green-100">
                                    <div className="min-w-[4px] h-12 bg-green-500 rounded-full mt-1"></div>
                                    <div>
                                        <span className="font-bold text-lg text-slate-900 block mb-2">운영 효율화 및 로스 관리</span>
                                        <p className="text-slate-700 leading-relaxed bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                                            "식자재 폐기율을 1% 감소시키고, 매출 발생 시간대(피크타임)에 맞춰 인력을 재배치함으로써 인당 생산성을 극대화해야 합니다."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Disclaimer Header for Page 2 */}
                        <div className="border-t border-[#E0E0E0] pt-6 mt-20 text-center">
                            <h4 className="text-slate-300 font-bold mb-1">COSTAR FOOD CFO REPORT</h4>
                            <p className="text-xs text-slate-400">
                                * 본 보고서는 코스타푸드 ERP 시스템에서 자동 생성된 데이터입니다. (2/2)
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
