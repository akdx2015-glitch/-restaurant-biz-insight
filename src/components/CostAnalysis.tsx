import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { IngredientData } from '../types';
import { AlertTriangle } from 'lucide-react';
import { CostReportGenerator } from './CostReportGenerator';
import { ErrorBoundary } from './ErrorBoundary';

interface CostAnalysisProps {
    data: IngredientData[];
    startDate: string;
    endDate?: string;
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#64748b'];

export function CostAnalysis({ data, startDate, endDate }: CostAnalysisProps) {
    // Aggregate data by category
    const categoryData = Object.values(data.reduce((acc, curr) => {
        if (!acc[curr.category]) {
            acc[curr.category] = { name: curr.category, value: 0 };
        }
        acc[curr.category].value += curr.totalPrice;
        return acc;
    }, {} as Record<string, { name: string; value: number }>));

    // ABC Analysis: Top 5 items by cost
    const sortedByCost = [...data].sort((a: any, b: any) => b.totalPrice - a.totalPrice);
    const topItems = sortedByCost.slice(0, 5);
    const totalCost = data.reduce((acc, curr) => acc + curr.totalPrice, 0);

    // Anomaly Detection (Mock logic: if price per unit > threshold for specific common items)
    // For now, just showing a static high-spender alert based on top item.
    const highestSpender = topItems[0];

    // ... (중략) ...

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 원가 보고서 생성기 (독립 데이터 소스: cost_data.xlsx) */}
            <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800">
                <ErrorBoundary>
                    <CostReportGenerator startDate={startDate} endDate={endDate} />
                </ErrorBoundary>
            </div>

            <div className="flex items-center gap-2 mt-8 mb-4">
                <div className="h-8 w-1 bg-orange-500 rounded-full"></div>
                <h3 className="text-xl font-bold text-white">업로드 데이터 분석</h3>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-4">카테고리별 지출 비중</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number | undefined) => `${(val ?? 0).toLocaleString()}원`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-4">ABC 분석 (핵심 지출 품목)</h3>
                    <div className="space-y-4">
                        {topItems.map((item, idx) => {
                            const percent = totalCost > 0 ? (item.totalPrice / totalCost) * 100 : 0;
                            return (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-orange-900/50 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-slate-200">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.category} | {item.vendor}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-200">{item.totalPrice.toLocaleString()}원</p>
                                        <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Anomaly / Alert Section */}
            <div className="bg-red-900/20 border border-red-900/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="text-red-500" />
                    <h3 className="text-lg font-bold text-red-400">원가 관리 경고 (Anomaly Detection)</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex items-start bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800">
                        <div className="mr-4 mt-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>
                        <div>
                            <p className="text-slate-200 font-medium">'{highestSpender?.name}' 구매 비용 과다</p>
                            <p className="text-slate-400 text-sm mt-1">
                                전체 식자재 비용의 <b>{totalCost > 0 && highestSpender ? ((highestSpender.totalPrice / totalCost) * 100).toFixed(1) : 0}%</b>를 차지하고 있습니다.
                                대체 품목을 찾거나 공급 단가 협상이 필요합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
