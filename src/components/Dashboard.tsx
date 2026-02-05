import { useState, useMemo, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, LineChart, Line, Legend, LabelList, ReferenceLine,
    PieChart, Pie
} from 'recharts';
import { TrendingUp, DollarSign, BarChart3, ChevronDown, Table as TableIcon, LineChart as LineIcon, Users, PieChart as PieChartIcon, FileText, MessageSquare, Send, X, Bot, Camera, FileBarChart, Copy } from 'lucide-react';

import type { RevenueData } from '../types';
import { DetailModal } from './DetailModal';
import { ReportViewer } from './ReportViewer';
import { CostReportGenerator } from './CostReportGenerator';
import { ErrorBoundary } from './ErrorBoundary';
import html2canvas from 'html2canvas';

import { CATEGORY_RULES, findCategory, getCostType } from '../utils/costUtils';

interface DashboardProps {
    data: RevenueData[];
    startDate: string;
    ingredientData?: import('../types').IngredientData[]; // 타입 임포트 혹은 상단의 import 활용
}

export function Dashboard({ data, startDate, ingredientData }: DashboardProps) {
    useEffect(() => {
        console.log('Reporting Period:', startDate);
    }, [startDate]);
    const [activeFeature, setActiveFeature] = useState<string | null>(null);
    const [focusedLabel, setFocusedLabel] = useState<{ index: number; type: 'revenue' | 'expense' } | null>(null);

    // Data Detail Modal State
    const [detailState, setDetailState] = useState<{ isOpen: boolean; title: string; data: RevenueData[]; total: number; dateRange?: string; }>({
        isOpen: false, title: '', data: [], total: 0
    });

    // Report Viewer State
    const [isReportOpen, setIsReportOpen] = useState(false);

    // AI Chat State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; timestamp: Date }>>([
        {
            id: '1',
            sender: 'ai',
            text: '안녕하세요! 저는 당신의 AI 경영 컨설턴트입니다. 매출 분석이나 원가 절감 방안에 대해 무엇이든 물어보세요.',
            timestamp: new Date(),
        },
    ]);

    const openDetail = (title: string, filteredData: RevenueData[]) => {
        const sorted = [...filteredData].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const total = sorted.reduce((acc, curr) => acc + (curr.revenue > 0 ? curr.revenue : curr.expense), 0);

        let dateRange = '';
        if (sorted.length > 0) {
            const dates = sorted.map(d => d.date);
            dateRange = `${dates[dates.length - 1]} ~ ${dates[0]}`;
        }

        setDetailState({
            isOpen: true,
            title,
            data: sorted,
            total,
            dateRange
        });
    };

    // AI Chat Handler
    const handleSendChat = () => {
        if (!chatInput.trim()) return;

        const userMsg = {
            id: Date.now().toString(),
            sender: 'user' as const,
            text: chatInput,
            timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, userMsg]);
        setChatInput('');

        // Mock AI Response
        setTimeout(() => {
            let aiResponseText = "죄송합니다. 현재 데이터를 분석 중이라 정확한 답변을 드리기 어렵습니다.";

            if (chatInput.includes("인건비")) {
                aiResponseText = "인건비 비중이 전월 대비 5% 상승했습니다. 특히 주말 저녁 시간대 아르바이트 근무 시간이 과다 책정되어 있는지 스케줄 점검을 추천드립니다.";
            } else if (chatInput.includes("매출")) {
                aiResponseText = "매출 추이는 긍정적입니다. 다만 객단가(1인당 평균 결제액)를 높이기 위해 세트 메뉴 구성을 다양화하는 전략이 필요해 보입니다.";
            } else if (chatInput.includes("원가") || chatInput.includes("식자재")) {
                aiResponseText = "현재 '소고기 등심'과 '계란'의 매입 단가가 시장 평균보다 높습니다. 대체 공급업체를 알아보거나 대량 구매 할인을 협상해보세요.";
            } else {
                aiResponseText = "흥미로운 질문이네요! 현재 보유한 데이터를 바탕으로 분석해보면, 고정비 절감보다는 변동비(식자재 로스) 관리가 더 시급한 과제입니다.";
            }

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                sender: 'ai' as const,
                text: aiResponseText,
                timestamp: new Date(),
            };
            setChatMessages((prev) => [...prev, aiMsg]);
        }, 1000);
    };

    // Chart Capture Handler
    const handleCaptureChart = async (chartId: string, chartName: string) => {
        const element = document.getElementById(chartId);
        if (!element) {
            alert('차트를 찾을 수 없습니다.');
            return;
        }

        try {
            // 캡처 버튼 숨기기
            const buttons = element.querySelectorAll('.capture-button');
            buttons.forEach(btn => (btn as HTMLElement).style.visibility = 'hidden');

            // html2canvas로 캡처
            const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2, // 고해상도 캡처
            });

            // 클립보드에 복사
            canvas.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        alert(`${chartName} 차트가 클립보드에 복사되었습니다.\n다른 앱에 붙여넣기(Ctrl+V)로 사용하세요.`);
                    } catch (err) {
                        console.error('클립보드 복사 실패:', err);
                        alert('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
                    }
                }
                // 버튼 다시 표시
                buttons.forEach(btn => (btn as HTMLElement).style.visibility = 'visible');
            });
        } catch (error) {
            console.error('차트 캡처 실패:', error);
            alert('차트 캡처에 실패했습니다.');
            // 에러 발생 시에도 버튼 복원
            const buttons = element.querySelectorAll('.capture-button');
            buttons.forEach(btn => (btn as HTMLElement).style.visibility = 'visible');
        }
    };


    // Optimized Data Pipeline
    const { chartData, isDaily, peakRev = 0, peakExp = 0, peakProfit = 0, yDomain, yTicks, categoryData, expenseCategoryData, costStructureData } = useMemo(() => {
        if (data.length === 0) return { chartData: [], isDaily: false, peakRev: 0, peakExp: 0, peakProfit: 0, yDomain: [0, 200] as [number, number], yTicks: undefined as number[] | undefined, categoryData: { categories: [], pieData: [], trend: [], totalRevenue: 0 }, expenseCategoryData: undefined, costStructureData: undefined };

        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const dates = sortedData.map(d => new Date(d.date).getTime());
        const diffDays = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
        const daily = diffDays <= 62;

        const CAP_VAL = 200; // 200만 원 (만 단위)

        // 1. Common Aggregation (by Date/Month)
        let mainAggregated: any[] = [];
        if (daily) {
            const dailyMap: { [key: string]: RevenueData } = {};
            sortedData.forEach(item => {
                if (!dailyMap[item.date]) dailyMap[item.date] = { ...item };
                else {
                    dailyMap[item.date].revenue += item.revenue;
                    dailyMap[item.date].expense += item.expense;
                    dailyMap[item.date].profit += item.profit;
                }
            });
            mainAggregated = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
        } else {
            const monthlyMap: { [key: string]: RevenueData } = {};
            sortedData.forEach(item => {
                const month = item.date.slice(0, 7);
                if (!monthlyMap[month]) monthlyMap[month] = { ...item, date: month };
                else {
                    monthlyMap[month].revenue += item.revenue;
                    monthlyMap[month].expense += item.expense;
                    monthlyMap[month].profit += item.profit;
                }
            });
            mainAggregated = Object.values(monthlyMap).sort((a, b) => a.date.localeCompare(b.date));
        }

        const mapping = mainAggregated.map(d => {
            const revMan = d.revenue / 10000;
            const expMan = d.expense / 10000;
            const prfMan = d.profit / 10000;
            return {
                date: d.date,
                valRevenue: daily ? Math.min(revMan, CAP_VAL) : revMan,
                valExpense: daily ? Math.min(expMan, CAP_VAL) : expMan,
                valProfit: daily ? (prfMan > 0 ? Math.min(prfMan, CAP_VAL) : Math.max(prfMan, -CAP_VAL)) : prfMan,
                displayRevenue: revMan,
                displayExpense: expMan,
                rawRevenue: d.revenue.toLocaleString() + '원',
                rawExpense: d.expense.toLocaleString() + '원',
                rawProfit: d.profit.toLocaleString() + '원'
            };
        });

        // 2. Client Specific Analysis
        const allClientData = Array.from(new Set(data.filter(d => d.revenue > 0).map(d => d.client || '일반')))
            .map(cat => ({
                name: cat,
                value: data.filter(d => (d.client || '일반') === cat).reduce((acc, curr) => acc + curr.revenue, 0)
            }))
            .sort((a, b) => b.value - a.value);

        // Summary Table shows ALL items (even < 200k)
        const summaryPieData = allClientData;

        // Charts (Pie/Line) show only > 200,000 KRW for clarity
        const pieData = allClientData.filter(item => item.value > 200000);
        const categories = pieData.map(item => item.name);
        const totalCatRev = summaryPieData.reduce((acc, curr) => acc + curr.value, 0);

        const categoryTrend = mainAggregated.map(agg => {
            const row: any = { date: agg.date };
            // For daily, match exactly. For monthly, match prefix.
            const sliceLen = daily ? 10 : 7;
            const relatedEntries = data.filter(rd => rd.date.slice(0, sliceLen) === agg.date);

            categories.forEach(cat => {
                const sum = relatedEntries.filter(rd => (rd.client || '일반') === cat).reduce((acc, curr) => acc + curr.revenue, 0);
                const valMan = sum / 10000;
                row[cat] = valMan; // Raw Man-won
                row[`val_${cat}`] = daily ? Math.min(valMan, CAP_VAL) : valMan;
                row[`display_${cat}`] = valMan;
            });
            return row;
        });

        const maxRev = Math.max(...mapping.map(d => d.displayRevenue));
        const maxExp = Math.max(...mapping.map(d => d.displayExpense));
        const maxPrf = Math.max(...mapping.map(d => Math.abs(d.valProfit)));

        // 3. Client Specific Expense Analysis
        const allClientExpData = Array.from(new Set(data.filter(d => d.expense > 0).map(d => d.client || '일반')))
            .map(cat => ({
                name: cat,
                value: data.filter(d => (d.client || '일반') === cat).reduce((acc, curr) => acc + curr.expense, 0)
            }))
            .sort((a, b) => b.value - a.value);

        const summaryPieExpData = allClientExpData;

        // Updated filter: 2,000,000 KRW default, but fallback to Top 5 if empty
        let pieExpData = allClientExpData.filter(item => item.value > 2000000);
        if (pieExpData.length === 0 && allClientExpData.length > 0) {
            pieExpData = allClientExpData.slice(0, 5);
        }
        const expCategories = pieExpData.map(item => item.name);
        const totalCatExp = summaryPieExpData.reduce((acc, curr) => acc + curr.value, 0);

        const expenseCategoryTrend = mainAggregated.map(agg => {
            const row: any = { date: agg.date };
            const sliceLen = daily ? 10 : 7;
            const relatedEntries = data.filter(rd => rd.date.slice(0, sliceLen) === agg.date);

            expCategories.forEach(cat => {
                const sum = relatedEntries.filter(rd => (rd.client || '일반') === cat).reduce((acc, curr) => acc + curr.expense, 0);
                const valMan = sum / 10000;
                row[cat] = valMan;
                row[`val_${cat}`] = daily ? Math.min(valMan, CAP_VAL) : valMan;
                row[`display_${cat}`] = valMan;
            });
            return row;
        });

        return {
            chartData: mapping,
            isDaily: daily,
            peakRev: maxRev,
            peakExp: maxExp,
            peakProfit: maxPrf,
            yDomain: daily ? [0, CAP_VAL] : [0, 'auto'],
            yTicks: daily ? [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200] : undefined,
            categoryData: { categories, pieData, summaryPieData, trend: categoryTrend, totalRevenue: totalCatRev },
            expenseCategoryData: { categories: expCategories, pieData: pieExpData, summaryPieData: summaryPieExpData, trend: expenseCategoryTrend, totalRevenue: totalCatExp },
            costStructureData: (() => {
                let totalFixed = 0;
                let totalVariable = 0;
                const fixedBreakdown: Record<string, number> = {};
                const variableBreakdown: Record<string, number> = {};

                data.forEach(d => {
                    if (d.expense <= 0) return;
                    // Combine Category (e.g. "인건비") and Client (e.g. "홍길동")
                    // This fixes the issue where explicit category columns were ignored.
                    const { type, category } = getCostType(d);

                    if (type === 'FIXED') {
                        totalFixed += d.expense;
                        fixedBreakdown[category] = (fixedBreakdown[category] || 0) + d.expense;
                    } else {
                        totalVariable += d.expense;
                        variableBreakdown[category] = (variableBreakdown[category] || 0) + d.expense;
                    }
                });

                const fixedPieData = Object.entries(fixedBreakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
                const variablePieData = Object.entries(variableBreakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

                return {
                    totalFixed,
                    totalVariable,
                    fixedPieData,
                    variablePieData,
                    overviewPieData: [
                        { name: '변동비', value: totalVariable },
                        { name: '고정비', value: totalFixed }
                    ]
                };
            })()
        };
    }, [data]);

    const totalRevenue = data.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExpense = data.reduce((acc, curr) => acc + curr.expense, 0);
    const totalProfit = data.reduce((acc, curr) => acc + curr.profit, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;


    const CenterOverlay = ({ value }: { value: number }) => (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <div className="bg-slate-900/90 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg border border-slate-700 whitespace-nowrap">
                {value.toLocaleString()}원
            </div>
        </div>
    );

    const toggleFeature = (feature: string) => {
        setActiveFeature(activeFeature === feature ? null : feature);
    };



    // Custom Label Factory to ensure correct dataKey identification
    const createCustomLabel = (type: 'revenue' | 'expense') => (props: any) => {
        const { x, y, index } = props;
        const d = chartData[index];
        if (!isDaily || !d) return null;

        const isRev = type === 'revenue';
        const realVal = isRev ? d.displayRevenue : d.displayExpense;
        const isOver = realVal >= 199.9;

        if (!isOver) {
            return (
                <text
                    x={x}
                    y={y - 12}
                    fill={isRev ? "#3b82f6" : "#ef4444"}
                    fontSize={10}
                    fontWeight="bold"
                    textAnchor="middle"
                >
                    {realVal.toLocaleString()}
                </text>
            );
        }

        const isFocused = focusedLabel?.index === index && focusedLabel?.type === type;

        // Interactivity: Clicking a label brings it to the top by adjusting offset
        let verticalOffset = isRev ? -45 : -15;
        if (focusedLabel?.index === index) {
            if (isFocused) verticalOffset = -55; // Bring clicked one highest
            else verticalOffset = -22; // Push non-clicked one down
        }

        const boxColor = isRev ? "#3b82f6" : "#ef4444";

        return (
            <g
                onClick={(e) => {
                    e.stopPropagation();
                    setFocusedLabel({ index, type });
                }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
            >
                <rect
                    x={x - 45}
                    y={y + verticalOffset - 20}
                    width={90}
                    height={24}
                    rx={6}
                    fill={boxColor}
                    stroke="white"
                    strokeWidth={isFocused ? 2.5 : 1.5}
                />
                <text
                    x={x}
                    y={y + verticalOffset - 4}
                    fill="white"
                    fontSize={10}
                    fontWeight="900"
                    textAnchor="middle"
                >
                    {`MAX: ${realVal.toLocaleString()}만`}
                </text>
            </g>
        );
    };



    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
                        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><DollarSign size={14} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-800">{totalRevenue.toLocaleString()}원</h3>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(totalRevenue.toLocaleString());
                                alert('매출 금액이 복사되었습니다.');
                            }}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="금액 복사"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expense</span>
                        <div className="p-1.5 bg-red-50 rounded-lg text-red-600"><DollarSign size={14} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-800">{totalExpense.toLocaleString()}원</h3>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(totalExpense.toLocaleString());
                                alert('지출 금액이 복사되었습니다.');
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="금액 복사"
                        >
                            <Copy size={16} />
                        </button>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</span>
                        <div className="p-1.5 bg-green-50 rounded-lg text-green-600"><TrendingUp size={14} /></div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalProfit.toLocaleString()}원
                        </h3>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(totalProfit.toLocaleString());
                                alert('순이익 금액이 복사되었습니다.');
                            }}
                            className="text-slate-400 hover:text-green-600 transition-colors"
                            title="금액 복사"
                        >
                            <Copy size={16} />
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">({profitMargin.toFixed(1)}%)</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 py-2">
                <button
                    onClick={() => toggleFeature('trend')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-sm border ${activeFeature === 'trend'
                        ? 'bg-slate-800 text-white border-slate-800 ring-4 ring-slate-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    <BarChart3 size={14} />
                    <span>추이 분석 리포트</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${activeFeature === 'trend' ? 'rotate-180' : ''}`} />
                </button>

                <button
                    onClick={() => toggleFeature('category')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-sm border ${activeFeature === 'category'
                        ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    <Users size={14} />
                    <span>거래처별매출</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${activeFeature === 'category' ? 'rotate-180' : ''}`} />
                </button>

                <button
                    onClick={() => toggleFeature('expenseCategory')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-sm border ${activeFeature === 'expenseCategory'
                        ? 'bg-red-600 text-white border-red-600 ring-4 ring-red-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    <TableIcon size={14} />
                    <span>거래처별지출</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${activeFeature === 'expenseCategory' ? 'rotate-180' : ''}`} />
                </button>

                <button
                    onClick={() => toggleFeature('costStructure')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-sm border ${activeFeature === 'costStructure'
                        ? 'bg-orange-600 text-white border-orange-600 ring-4 ring-orange-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    <PieChartIcon size={14} />
                    <span>변동비/고정비별지출</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${activeFeature === 'costStructure' ? 'rotate-180' : ''}`} />
                </button>



                {/* 보고서 생성 버튼 - 네비게이션 바 우측 끝 */}
                {/* 보고서 생성 버튼 - 네비게이션 바 우측 끝 */}
                <button
                    onClick={() => setIsReportOpen(true)}
                    className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all duration-300 shadow-md border border-slate-700"
                    title="경영 분석 보고서 생성"
                >
                    <FileText size={14} />
                    <span>보고서 생성</span>
                </button>

                {/* AI 상담 버튼 - 보고서 생성 버튼 옆 */}
                <button
                    onClick={() => setIsAIChatOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full text-xs font-bold transition-all duration-300 shadow-md border border-orange-500"
                    title="AI 경영 컨설턴트"
                >
                    <MessageSquare size={14} />
                    <span>AI 상담</span>
                </button>
            </div>

            {activeFeature === 'trend' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 pb-8">
                    <div id="chart-trend-analysis" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-visible relative">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><LineIcon size={18} /></div>
                                <h4 className="font-bold text-slate-800 text-base">{isDaily ? '일별' : '월별'} 매출/지출</h4>
                            </div>
                            <button
                                onClick={() => handleCaptureChart('chart-trend-analysis', '추이 분석')}
                                className="capture-button flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                title="차트 캡처"
                            >
                                <Camera size={14} />
                                <span>캡처</span>
                            </button>
                        </div>
                        <div className="h-[350px] w-full mt-4 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 60, right: 30, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis
                                        domain={yDomain as any}
                                        ticks={yTicks}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val.toLocaleString()}만`}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-200" style={{ backgroundColor: 'white' }}>
                                                        <p className="custom-tooltip-label mb-2 border-b border-slate-100 pb-1"
                                                            style={{
                                                                color: '#000000',
                                                                fontSize: '16px',
                                                                fontWeight: '900',
                                                                textShadow: 'none',
                                                                margin: 0,
                                                                paddingBottom: '4px'
                                                            }}>
                                                            {label}
                                                        </p>
                                                        {payload.map((entry: any, index: number) => (
                                                            <p key={index} style={{ color: entry.color }} className="text-sm font-bold my-1 flex justify-between gap-4">
                                                                <span>{entry.name} :</span>
                                                                <span>
                                                                    {entry.name === "총 매출" ? entry.payload.rawRevenue :
                                                                        entry.name === "총 지출" ? entry.payload.rawExpense :
                                                                            entry.value}
                                                                </span>
                                                            </p>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {isDaily && (peakRev > 200 || peakExp > 200) && (
                                        <ReferenceLine
                                            y={200}
                                            stroke="#f59e0b"
                                            strokeDasharray="3 3"
                                        />
                                    )}
                                    {!isDaily && (
                                        <ReferenceLine
                                            y={peakRev}
                                            stroke="#f59e0b"
                                            strokeDasharray="3 3"
                                            label={{
                                                position: 'top',
                                                value: `MAX: ${peakRev.toLocaleString()}만`,
                                                fill: '#d97706',
                                                fontSize: 12,
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    )}
                                    <Legend verticalAlign="top" height={40} />
                                    <Line
                                        type="monotone"
                                        dataKey="valRevenue"
                                        name="총 매출"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#3b82f6' }}
                                    >
                                        <LabelList dataKey="valRevenue" content={createCustomLabel('revenue')} />
                                    </Line>
                                    <Line
                                        type="monotone"
                                        dataKey="valExpense"
                                        name="총 지출"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#ef4444' }}
                                    >
                                        <LabelList dataKey="valExpense" content={createCustomLabel('expense')} />
                                    </Line>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-8 border-b border-slate-50 pb-4">
                            <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp size={18} /></div>
                            <h4 className="font-bold text-slate-800 text-base">{isDaily ? '일별' : '월별'} 순이익</h4>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(val) => `${val.toLocaleString()}만`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                        formatter={(_val: any, _name: any, props: any) => props?.payload?.rawProfit || _val}
                                    />
                                    <ReferenceLine y={peakProfit} stroke="#10b981" strokeDasharray="3 3" />
                                    <Bar dataKey="valProfit" name="순이익" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.valProfit >= 0 ? '#ef4444' : '#3b82f6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                            <TableIcon size={18} className="text-slate-500" />
                            <h4 className="font-bold text-slate-800 text-sm">경영 요약 데이터</h4>
                        </div>
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">{isDaily ? '날짜' : '월'}</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">매출</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">지출</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100 text-right">순이익</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chartData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-700 border-b border-slate-50">{row.date}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-50">{row.rawRevenue}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-50">{row.rawExpense}</td>
                                            <td className={`px-6 py-4 text-sm font-bold border-b border-slate-50 text-right ${row.valProfit >= 0 ? 'text-slate-800' : 'text-blue-600'}`}>{row.rawProfit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeFeature === 'category' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 pb-8">
                    {(() => {
                        const { categories = [], pieData = [], summaryPieData = [], trend = [], totalRevenue: totalCatRevenue = 0 } = categoryData || {};
                        // Expanded color palette for better distinction (16 colors)
                        const COLORS = [
                            '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6',
                            '#f43f5e', '#fb923c', '#0ea5e9', '#84cc16', '#a855f7', '#d946ef', '#06b6d4', '#d1d5db'
                        ];

                        const getCatColor = (name: string) => {
                            const allUniqueNames = (summaryPieData || []).map((d: any) => d.name);
                            const idx = allUniqueNames.indexOf(name);
                            if (idx === -1) return '#6b7280';
                            const totalCount = allUniqueNames.length;

                            if (totalCount > COLORS.length && idx >= totalCount - 2) {
                                return COLORS[COLORS.length - 1];
                            }
                            return COLORS[idx % COLORS.length];
                        };

                        // Stable component for LabelList
                        const CategoryLabel = (props: any) => {
                            const { x, y, index, dataKey } = props;
                            if (index === undefined || !trend || !trend[index]) return null;

                            const cat = typeof dataKey === 'string' ? dataKey.replace('val_', '') : '';
                            if (!cat) return null;

                            const d = trend[index];
                            const realVal = d?.[`display_${cat}`];
                            if (!isDaily || realVal === undefined || realVal < 199.9) return null;

                            const isFocused = (focusedLabel as any)?.index === index && (focusedLabel as any)?.catKey === cat;
                            const verticalOffset = isFocused ? -45 : -25;
                            const color = getCatColor(cat);

                            return (
                                <g
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFocusedLabel({ index, type: 'revenue', catKey: cat } as any);
                                    }}
                                    style={{ cursor: 'pointer', pointerEvents: 'all' }}
                                >
                                    <rect x={x - 45} y={y + verticalOffset - 20} width={90} height={24} rx={6} fill={color} stroke="white" strokeWidth={isFocused ? 2.5 : 1.5} />
                                    <text x={x} y={y + verticalOffset - 4} fill="white" fontSize={10} fontWeight="900" textAnchor="middle">{`MAX: ${realVal.toLocaleString()}만`}</text>
                                </g>
                            );
                        };

                        const renderRevenueLabel = ({ x, y, cx, name, percent, value }: any) => {
                            if ((percent || 0) < 0.03) return null; // Hide small segments (< 3%) to avoid overlap
                            return (
                                <text x={x} y={y} fill={getCatColor(name)} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                                    <tspan fontWeight="normal">{`${name} (${((percent || 0) * 100).toFixed(0)}%) `}</tspan>
                                    <tspan fontWeight="bold">{`${(value || 0).toLocaleString()}원`}</tspan>
                                </text>
                            );
                        };

                        return (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div id="chart-sales-by-client" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                                        <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TableIcon size={18} /></div>
                                                <h4 className="font-bold text-slate-800 text-base">매출 비중 (Pie Chart)</h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                                    <span className="text-[10px] text-slate-500 font-medium">※ 3% 이하 생략</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCaptureChart('chart-sales-by-client', '거래처별 매출')}
                                                    className="capture-button flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                                    title="차트 캡처"
                                                >
                                                    <Camera size={14} />
                                                    <span>캡처</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-[300px] w-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60} outerRadius={80}
                                                        paddingAngle={5} dataKey="value"
                                                        label={renderRevenueLabel}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={getCatColor(entry.name)} />
                                                        ))}
                                                    </Pie>
                                                    <Legend wrapperStyle={{ bottom: 0, left: 0, width: '100%', fontSize: '12px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <CenterOverlay value={totalCatRevenue} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                                            <TableIcon size={18} className="text-slate-500" />
                                            <h4 className="font-bold text-slate-800 text-sm">거래처별 요약</h4>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">거래처</th>
                                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">총 매출금액 (원)</th>
                                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100 text-right">비중 (%)</th>
                                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100 text-center">상세</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {summaryPieData.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-bold text-slate-700 border-b border-slate-50">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCatColor(row.name) }}></div>
                                                                    {row.name}
                                                                    {row.value <= 200000 && <span className="text-[9px] text-slate-400 font-normal ml-1">(소액)</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-50">
                                                                {row.value.toLocaleString()}원
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-bold border-b border-slate-50 text-right text-slate-800">
                                                                {((row.value / (totalCatRevenue || 1)) * 100).toFixed(2)}%
                                                            </td>
                                                            <td className="px-6 py-4 text-sm border-b border-slate-50 text-center">
                                                                <button
                                                                    onClick={() => openDetail(row.name, data.filter(d => (d.client || '일반') === row.name && d.revenue > 0))}
                                                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-md text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center justify-center"
                                                                    title="상세 내역 보기"
                                                                >
                                                                    <FileText size={15} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-900 text-white">
                                                        <td className="px-6 py-4 text-sm font-black">총합</td>
                                                        <td className="px-6 py-4 text-sm font-black">{totalCatRevenue.toLocaleString()}원</td>
                                                        <td className="px-6 py-4 text-sm font-black text-right">100.00%</td>
                                                        <td className="px-6 py-4 border-b border-slate-50"></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-visible">
                                    <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><LineIcon size={18} /></div>
                                            <h4 className="font-bold text-slate-800 text-base">{isDaily ? '일별' : '월별'} 거래처별 매출 추이</h4>
                                        </div>
                                        <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                            <span className="text-[10px] text-slate-500 font-medium">※ 20만원 이하 생략</span>
                                        </div>
                                    </div>
                                    <div className="h-[450px] w-full mt-4 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trend} margin={{ top: 60, right: 30, left: 10, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                                                <YAxis
                                                    domain={isDaily ? [0, 200] : [0, 'auto']}
                                                    ticks={isDaily ? [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200] : undefined}
                                                    tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
                                                    tickFormatter={(val) => (val || 0).toLocaleString() + '만'}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                                    itemSorter={(item: any) => -(item.value || 0)}
                                                    labelFormatter={(label, payload) => {
                                                        const total = payload?.reduce((sum, item) => {
                                                            const d = item.payload;
                                                            const name = item.name;
                                                            let val = item.value || 0;
                                                            if (d && name && d[`display_${name}`] !== undefined) {
                                                                val = d[`display_${name}`];
                                                            }
                                                            return sum + val;
                                                        }, 0) || 0;
                                                        return (
                                                            <div className="mb-2">
                                                                <div className="text-[13px] font-black text-slate-800 border-b border-slate-100 pb-1 mb-1">
                                                                    총합: {total.toLocaleString()}만
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">{label}</div>
                                                            </div>
                                                        );
                                                    }}
                                                    formatter={(_val: any, name: any, props: any) => {
                                                        const d = props?.payload;
                                                        if (d && name && d?.[`display_${name}`] !== undefined) {
                                                            const realVal = d[`display_${name}`];
                                                            return [realVal.toLocaleString() + '만', name];
                                                        }
                                                        return [(_val || 0).toLocaleString() + '만', name];
                                                    }}
                                                />
                                                <Legend verticalAlign="top" height={40} />
                                                {isDaily && <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="3 3" />}
                                                {categories.map((cat) => (
                                                    <Line
                                                        key={cat} type="monotone" dataKey={`val_${cat}`} name={cat}
                                                        stroke={getCatColor(cat)} strokeWidth={3}
                                                        dot={{ r: 4, fill: getCatColor(cat) }} activeDot={{ r: 6 }}
                                                    >
                                                        {isDaily && <LabelList dataKey={`val_${cat}`} content={CategoryLabel} />}
                                                    </Line>
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 mt-0.5"><Users size={14} /></div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800 mb-1">상세 분석 가이드</h5>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    62일 이하 기간 조회 시 각 매출 항목별 성과를 정밀하게 분석할 수 있습니다. 200만 원 초과 시 <strong>MAX 말풍선</strong>으로 실금액이 표시되며,
                                                    차트 상단의 범례를 클릭하여 필터링 분석이 가능합니다.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div >
            )}

            {
                activeFeature === 'expenseCategory' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 pb-8">
                        {(() => {
                            const { categories = [], pieData = [], summaryPieData = [], trend = [], totalRevenue: totalCatExpense = 0 } = expenseCategoryData || {};
                            const COLORS = [
                                '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6',
                                '#f43f5e', '#fb923c', '#0ea5e9', '#84cc16', '#a855f7', '#d946ef', '#06b6d4', '#475569'
                            ];

                            const getCatColor = (name: string) => {
                                const allUniqueNames = summaryPieData.map((d: any) => d.name);
                                const totalCount = allUniqueNames.length;
                                const idx = allUniqueNames.indexOf(name);
                                if (idx === -1) return '#6b7280';
                                if (totalCount > COLORS.length && idx >= totalCount - 2) {
                                    return COLORS[COLORS.length - 1];
                                }
                                return COLORS[idx % COLORS.length];
                            };

                            const CategoryLabel = (props: any) => {
                                const { x, y, index, dataKey } = props;
                                if (index === undefined || !trend || !trend[index]) return null;
                                const catName = typeof dataKey === 'string' ? dataKey.replace('val_', '') : '';
                                const val = trend[index][catName];
                                if (val === undefined || !isDaily) return null;
                                const isOver = val >= 19.9;
                                if (isOver) {
                                    return (
                                        <g transform={`translate(${x},${y - 25})`}>
                                            <rect x="-30" y="-15" width="60" height="20" rx="4" fill={getCatColor(catName)} />
                                            <text x="0" y="-2" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">MAX</text>
                                        </g>
                                    );
                                }
                                return <text x={x} y={y - 8} fill={getCatColor(catName)} fontSize="9" fontWeight="bold" textAnchor="middle">{val.toLocaleString()}</text>;
                            };

                            const renderExpenseLabel = ({ x, y, cx, name, percent, value }: any) => {
                                if ((percent || 0) < 0.03) return null; // Hide small segments (< 3%) to avoid overlap
                                return (
                                    <text x={x} y={y} fill={getCatColor(name)} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                                        <tspan fontWeight="normal">{`${name} (${((percent || 0) * 100).toFixed(0)}%) `}</tspan>
                                        <tspan fontWeight="bold">{`${(value || 0).toLocaleString()}원`}</tspan>
                                    </text>
                                );
                            };

                            return (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div id="chart-expense-by-client" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                                            <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-red-50 rounded-lg text-red-600"><TableIcon size={18} /></div>
                                                    <h4 className="font-bold text-slate-800 text-base">지출 비중 (Pie Chart)</h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                                        <span className="text-[10px] text-slate-500 font-medium">※ 200만원 이하 생략 (부족 시 상위 5개)</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCaptureChart('chart-expense-by-client', '거래처별 지출')}
                                                        className="capture-button flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                                        title="차트 캡처"
                                                    >
                                                        <Camera size={14} />
                                                        <span>캡처</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-[350px] w-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={60}
                                                            outerRadius={80}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            label={renderExpenseLabel}
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={getCatColor(entry.name)} />
                                                            ))}
                                                        </Pie>
                                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ bottom: 0, left: 0, width: '100%', fontSize: '11px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <CenterOverlay value={totalCatExpense} />
                                            </div>
                                            <div className="mt-8 text-center pt-2">
                                                <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                    ※ 3% 이하 및 200만원 이하 항목은 제외되나, 항목이 없을 경우 상위 5개가 표시됩니다.
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[480px]">
                                            <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4 shrink-0">
                                                <div className="p-2 bg-red-50 rounded-lg text-red-600"><TableIcon size={18} /></div>
                                                <h4 className="font-bold text-slate-800 text-base">거래처별 지출 요약</h4>
                                            </div>
                                            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                                <table className="w-full text-left">
                                                    <thead className="sticky top-0 bg-white z-10">
                                                        <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 bg-white">
                                                            <th className="px-6 py-3">거래처</th>
                                                            <th className="px-6 py-3">총 지출금액 (원)</th>
                                                            <th className="px-6 py-3 text-right">비중 (%)</th>
                                                            <th className="px-6 py-3 text-center">상세</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {summaryPieData.map((row, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-6 py-4 text-sm font-bold text-slate-700 border-b border-slate-50">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCatColor(row.name) }}></div>
                                                                        {row.name}
                                                                        {row.value <= 2000000 && <span className="text-[9px] text-slate-400 font-normal ml-1">(소액)</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-50">
                                                                    {row.value.toLocaleString()}원
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50 text-right">
                                                                    {totalCatExpense > 0 ? ((row.value / totalCatExpense) * 100).toFixed(2) : '0.00'}%
                                                                </td>
                                                                <td className="px-6 py-4 text-sm border-b border-slate-50 text-center">
                                                                    <button
                                                                        onClick={() => openDetail(row.name, data.filter(d => (d.client || '일반') === row.name && d.expense > 0))}
                                                                        className="p-1.5 bg-red-50 hover:bg-red-100 rounded-md text-red-600 hover:text-red-700 transition-colors inline-flex items-center justify-center"
                                                                        title="상세 내역 보기"
                                                                    >
                                                                        <FileText size={15} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-auto pt-4 bg-white border-t border-slate-100 shrink-0">
                                                <div className="bg-slate-800 text-white font-bold p-4 rounded-xl flex justify-between items-center">
                                                    <span>총합</span>
                                                    <div className="flex gap-12 items-center">
                                                        <span>{totalCatExpense.toLocaleString()}원</span>
                                                        <span className="text-slate-400 text-xs text-right w-16">100.00%</span>
                                                    </div>
                                                    <div className="w-[50px]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div >

                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-visible">
                                        <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-red-50 rounded-lg text-red-600"><LineIcon size={18} /></div>
                                                <h4 className="font-bold text-slate-800 text-base">{isDaily ? '일별' : '월별'} 거래처별 지출 추이</h4>
                                            </div>
                                            <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                                <span className="text-[10px] text-slate-500 font-medium">※ 20만원 이하 생략 (부족 시 상위 5개)</span>
                                            </div>
                                        </div>
                                        <div className="h-[450px] w-full mt-4 relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={trend} margin={{ top: 60, right: 30, left: 10, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                                                    <YAxis
                                                        domain={isDaily ? [0, 200] : [0, 'auto']}
                                                        ticks={isDaily ? [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200] : undefined}
                                                        tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
                                                        tickFormatter={(val) => (val || 0).toLocaleString() + '만'}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                                        itemSorter={(item: any) => -(item.value || 0)}
                                                        labelFormatter={(label, payload) => {
                                                            const total = payload?.reduce((sum, item) => {
                                                                const d = item.payload;
                                                                const name = item.name;
                                                                let val = item.value || 0;
                                                                if (d && name && d[`display_${name}`] !== undefined) {
                                                                    val = d[`display_${name}`];
                                                                }
                                                                return sum + val;
                                                            }, 0) || 0;
                                                            return (
                                                                <div className="mb-2">
                                                                    <div className="text-[13px] font-black text-slate-800 border-b border-slate-100 pb-1 mb-1">
                                                                        총합: {total.toLocaleString()}만
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400">{label}</div>
                                                                </div>
                                                            );
                                                        }}
                                                        formatter={(_val: any, name: any, props: any) => {
                                                            const d = props?.payload;
                                                            if (d && name && d?.[`display_${name}`] !== undefined) {
                                                                const realVal = d[`display_${name}`];
                                                                return [realVal.toLocaleString() + '만', name];
                                                            }
                                                            return [(_val || 0).toLocaleString() + '만', name];
                                                        }}
                                                    />
                                                    <Legend verticalAlign="top" height={40} />
                                                    {isDaily && (peakExp > 200) && <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="3 3" />}
                                                    {categories.map((cat) => (
                                                        <Line
                                                            key={cat}
                                                            type="monotone"
                                                            dataKey={`val_${cat}`}
                                                            name={cat}
                                                            stroke={getCatColor(cat)}
                                                            strokeWidth={3}
                                                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                                            animationDuration={1500}
                                                        >
                                                            {isDaily && <LabelList dataKey={`val_${cat}`} content={CategoryLabel} />}
                                                        </Line>
                                                    ))}
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )
            }

            {
                activeFeature === 'costStructure' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 pb-8">
                        {(() => {
                            const { totalFixed = 0, totalVariable = 0, fixedPieData = [], variablePieData = [], overviewPieData = [] } = costStructureData || {};
                            const totalCost = totalFixed + totalVariable;

                            // Overview Pie Colors
                            const OVERVIEW_COLORS = ['#ef4444', '#3b82f6']; // Red (Variable), Blue (Fixed)

                            // Common Pie Chart Component
                            const DetailedPieChart = ({ data, colors, total }: { data: { name: string, value: number }[], colors: string[], total: number }) => {
                                const renderCustomLabel = ({ x, y, cx, name, percent, value, index }: any) => {
                                    if ((percent || 0) < 0.03) return null;
                                    return (
                                        <text x={x} y={y} fill={colors[index % colors.length]} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                                            <tspan fontWeight="normal">{`${name} (${((percent || 0) * 100).toFixed(1)}%) `}</tspan>
                                            <tspan fontWeight="bold">{`${(value || 0).toLocaleString()}원`}</tspan>
                                        </text>
                                    );
                                };

                                return (
                                    <div className="h-[300px] w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data}
                                                    cx="50%" cy="50%"
                                                    innerRadius={60} outerRadius={90}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={renderCustomLabel}
                                                >
                                                    {data.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                                    ))}
                                                </Pie>
                                                <Legend wrapperStyle={{ bottom: 0, left: 0, width: '100%', fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <CenterOverlay value={total} />
                                    </div>
                                );
                            };

                            // Common Table Component
                            const CostTable = ({ title, data: tableData, total, onRowClick }: { title: string, data: { name: string, value: number }[], total: number, onRowClick?: (row: any) => void }) => (
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
                                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2 shrink-0">
                                        <TableIcon size={18} className="text-slate-500" />
                                        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
                                    </div>
                                    <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                        <table className="w-full text-left">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 bg-white">
                                                    <th className="px-6 py-3">{title.replace(' 요약', '')}</th>
                                                    <th className="px-6 py-3">총 금액 (원)</th>
                                                    <th className="px-6 py-3 text-right">백분율 (%)</th>
                                                    <th className="px-6 py-3 text-center">상세</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tableData.map((row: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-bold text-slate-700 border-b border-slate-50">{row.name}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 border-b border-slate-50">
                                                            {row.value.toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold text-slate-800 border-b border-slate-50 text-right">
                                                            {total > 0 ? ((row.value / total) * 100).toFixed(1) : '0.0'}%
                                                        </td>
                                                        <td className="px-6 py-4 text-sm border-b border-slate-50 text-center">
                                                            {onRowClick && (
                                                                <button
                                                                    onClick={() => onRowClick(row)}
                                                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-600 hover:text-slate-800 transition-colors inline-flex items-center justify-center"
                                                                    title="상세 내역 보기"
                                                                >
                                                                    <FileText size={15} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-900 font-bold text-white border-t border-slate-800 sticky bottom-0">
                                                <tr>
                                                    <td className="px-6 py-4 text-sm">총합</td>
                                                    <td className="px-6 py-4 text-base">{total.toLocaleString()}원</td>
                                                    <td className="px-6 py-4 text-sm text-right">100.00%</td>
                                                    <td className="px-6 py-4 text-sm text-right"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            );

                            return (
                                <div className="space-y-8">
                                    {/* 1. Overview Section */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div id="chart-cost-overview" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="font-bold text-slate-800 text-base">변동비 및 고정비 지출 백분율</h4>
                                                <button
                                                    onClick={() => handleCaptureChart('chart-cost-overview', '변동비/고정비 요약')}
                                                    className="capture-button flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                                    title="차트 캡처"
                                                >
                                                    <Camera size={14} />
                                                    <span>캡처</span>
                                                </button>
                                            </div>
                                            <div className="h-[300px] w-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={overviewPieData}
                                                            cx="50%" cy="50%"
                                                            innerRadius={60} outerRadius={100}
                                                            paddingAngle={0}
                                                            dataKey="value"
                                                            label={({ x, y, cx, name, percent, value }: any) => {
                                                                if ((percent || 0) < 0.03) return null;
                                                                const OVERVIEW_COLORS = ['#ef4444', '#3b82f6'];
                                                                const colorIndex = name === '변동비' ? 0 : 1;
                                                                return (
                                                                    <text x={x} y={y} fill={OVERVIEW_COLORS[colorIndex]} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                                                                        <tspan fontWeight="normal">{`${name} ${((percent || 0) * 100).toFixed(1)}% `}</tspan>
                                                                        <tspan fontWeight="bold">{`${(value || 0).toLocaleString()}원`}</tspan>
                                                                    </text>
                                                                );
                                                            }}
                                                        >
                                                            {overviewPieData.map((_entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={OVERVIEW_COLORS[index % OVERVIEW_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Legend wrapperStyle={{ bottom: 0, left: 0, width: '100%', fontSize: '12px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <CenterOverlay value={totalCost} />
                                            </div>
                                        </div>

                                        <CostTable
                                            title="변동비항목"
                                            data={overviewPieData}
                                            total={totalCost}
                                            onRowClick={(row) => {
                                                const type = row.name === '고정비' ? 'FIXED' : 'VARIABLE';
                                                const filtered = data.filter(d => d.expense > 0 && getCostType(d).type === type);
                                                openDetail(row.name, filtered);
                                            }}
                                        />
                                    </div>

                                    {/* 2. Variable Cost Detail */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div id="chart-variable-cost-detail" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="font-bold text-slate-800 text-base">변동비 지출 항목별 백분율</h4>
                                                <button
                                                    onClick={() => handleCaptureChart('chart-variable-cost-detail', '변동비 상세')}
                                                    className="capture-button flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                                    title="차트 캡처"
                                                >
                                                    <Camera size={14} />
                                                    <span>캡처</span>
                                                </button>
                                            </div>
                                            <DetailedPieChart
                                                data={variablePieData}
                                                colors={['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#64748b']}
                                                total={totalVariable}
                                            />
                                        </div>
                                        <CostTable
                                            title="변동비 항목"
                                            data={variablePieData}
                                            total={totalVariable}
                                            onRowClick={(row) => {
                                                const filtered = data.filter(d => {
                                                    if (d.expense <= 0) return false;
                                                    const info = getCostType(d);
                                                    return info.type === 'VARIABLE' && info.category === row.name;
                                                });
                                                openDetail(row.name, filtered);
                                            }}
                                        />
                                    </div>

                                    {/* 3. Fixed Cost Detail */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div id="chart-fixed-cost-detail" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="font-bold text-slate-800 text-base">고정비 지출 항목별 백분율</h4>
                                                <button
                                                    onClick={() => handleCaptureChart('chart-fixed-cost-detail', '고정비 상세')}
                                                    className="capture-button flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                                    title="차트 캡처"
                                                >
                                                    <Camera size={14} />
                                                    <span>캡처</span>
                                                </button>
                                            </div>
                                            {fixedPieData.length > 0 ? (
                                                <DetailedPieChart
                                                    data={fixedPieData}
                                                    colors={['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#64748b']}
                                                    total={totalFixed}
                                                />
                                            ) : (
                                                <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-400">
                                                    <div className="p-3 bg-slate-50 rounded-full mb-3">
                                                        <TableIcon size={24} className="opacity-50" />
                                                    </div>
                                                    <p className="text-sm font-medium">고정비 데이터가 없습니다.</p>
                                                    <p className="text-xs mt-1">지출 명세서 항목명에 '임대료', '관리비' 등이 포함되어 있는지 확인해주세요.</p>
                                                </div>
                                            )}
                                        </div>
                                        <CostTable
                                            title="고정비 항목"
                                            data={fixedPieData}
                                            total={totalFixed}
                                            onRowClick={(row) => {
                                                const filtered = data.filter(d => {
                                                    if (d.expense <= 0) return false;
                                                    const info = getCostType(d);
                                                    return info.type === 'FIXED' && info.category === row.name;
                                                });
                                                openDetail(row.name, filtered);
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )
            }

            {/* 원가/식자재 보고서 */}
            {activeFeature === 'costReport' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 pb-8">
                    <ErrorBoundary>
                        <CostReportGenerator startDate={startDate} ingredientData={ingredientData} />
                    </ErrorBoundary>
                </div>
            )}

            <div className="bg-slate-900/50 p-6 rounded-2xl shadow-xl border border-slate-800">
                <div className="flex items-start gap-4">
                    <div className="bg-orange-500/10 p-2 rounded-lg shadow-sm"><BarChart3 className="text-orange-500" size={20} /></div>
                    <div>
                        <h4 className="font-bold text-white text-base mb-2">프리미엄 지능형 분석</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            차트의 정점(Peak)이 Y축 눈금에 맞춰 정확하게 고정되었습니다. MAX 라인을 통해 기간 내 최고 성과 지점을 즉시 식별할 수 있습니다.
                        </p>
                    </div>
                </div>
            </div>
            <DetailModal
                isOpen={detailState.isOpen}
                onClose={() => setDetailState(prev => ({ ...prev, isOpen: false }))}
                title={detailState.title}
                data={detailState.data}
                totalAmount={detailState.total}
                dateRange={detailState.dateRange}
            />
            <ReportViewer
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                data={data}
                dateRange={detailState.dateRange || '전체 기간'}
            />

            {/* AI Chat Modal */}
            {
                isAIChatOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md h-[600px] flex flex-col overflow-hidden animate-fade-in-up">
                            {/* Header */}
                            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                                <div className="flex items-center gap-2">
                                    <div className="bg-orange-500 p-1.5 rounded-lg">
                                        <Bot size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">AI 경영 컨설턴트</h3>
                                        <p className="text-[10px] text-slate-300">Online • Data-driven Insight</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAIChatOpen(false)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                {chatMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.sender === 'user'
                                                ? 'bg-orange-500 text-white rounded-tr-none'
                                                : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div className="p-3 bg-white border-t border-slate-100">
                                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                        placeholder="궁금한 점을 물어보세요..."
                                        className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700"
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
