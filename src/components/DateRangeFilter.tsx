import { useMemo } from 'react';
import { Calendar, Search, FileText } from 'lucide-react';

interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    minDate: string;
    maxDate: string;
    availableYears: string[];
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onApply: () => void;
    onGenerateReport?: () => void;
}

export function DateRangeFilter({
    startDate,
    endDate,
    minDate,
    maxDate,
    availableYears,
    onStartDateChange,
    onEndDateChange,
    onApply,
    onGenerateReport
}: DateRangeFilterProps) {
    const currentYear = startDate ? startDate.substring(0, 4) : (availableYears[0] || new Date().getFullYear().toString());

    const handleYearClick = (year: string) => {
        onStartDateChange(`${year}-01-01`);
        onEndDateChange(`${year}-12-31`);
    };

    const handleMonthClick = (month: number) => {
        const year = currentYear;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        const lastDay = new Date(parseInt(year), month, 0).getDate();
        onStartDateChange(`${year}-${monthStr}-01`);
        onEndDateChange(`${year}-${monthStr}-${lastDay}`);
    };

    const selectedPeriodLabel = useMemo(() => {
        if (!startDate || !endDate) return null;
        const startY = startDate.substring(0, 4);
        const startM = startDate.substring(5, 7);
        const endY = endDate.substring(0, 4);
        const endM = endDate.substring(5, 7);
        const startD = startDate.substring(8, 10);
        const endD = endDate.substring(8, 10);

        if (startY === endY && startM === endM && startD === '01' && parseInt(endD) >= 28) {
            return `${startY}년 ${parseInt(startM)}월`;
        }
        if (startY === endY && startM === '01' && startD === '01' && endM === '12' && endD === '31') {
            return `${startY}년 전체`;
        }
        return null;
    }, [startDate, endDate]);

    return (
        <div className="space-y-4 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in-up">
                <div className="flex flex-col gap-6">
                    {/* Filter Header & Manual Inputs */}
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-600">
                            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                                <Calendar size={18} />
                            </div>
                            <span className="font-bold text-sm">분석 기간 설정</span>
                        </div>

                        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">From</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    min={minDate}
                                    max={maxDate}
                                    onChange={(e) => onStartDateChange(e.target.value)}
                                    className="w-full pl-14 pr-3 py-2.5 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-slate-50 text-slate-700"
                                />
                            </div>
                            <span className="text-slate-300">~</span>
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">To</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={minDate}
                                    max={maxDate}
                                    onChange={(e) => onEndDateChange(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2.5 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-slate-50 text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={onApply}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95"
                            >
                                <Search size={14} />
                                <span>분석 시작</span>
                            </button>

                            {onGenerateReport && (
                                <button
                                    onClick={onGenerateReport}
                                    className="flex-1 md:flex-none px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                                    title="CFO 핵심 경영 보고서 생성"
                                >
                                    <FileText size={14} />
                                    <span>CFO 보고서</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-50">
                        {/* Year Buttons */}
                        {availableYears.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase w-12">Year</span>
                                {availableYears.map(year => (
                                    <button
                                        key={year}
                                        onClick={() => handleYearClick(year)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentYear === year
                                            ? 'bg-slate-800 text-white shadow-sm'
                                            : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'
                                            }`}
                                    >
                                        {year}년
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Month Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase w-12">Month</span>
                            <div className="flex flex-wrap gap-1.5">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                    const isSelected = startDate.startsWith(`${currentYear}-${m < 10 ? '0' + m : m}`) &&
                                        endDate.includes(`-${m < 10 ? '0' + m : m}-`);
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => handleMonthClick(m)}
                                            className={`w-9 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${isSelected
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            {m}월
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Period Display */}
            {selectedPeriodLabel && (
                <div className="px-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                        <span className="text-xs font-black tracking-tight">{selectedPeriodLabel} 분석 데이터입니다.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
