import { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CostAnalysis } from './components/CostAnalysis';
import { DateRangeFilter } from './components/DateRangeFilter';
import { SAMPLE_REVENUE_DATA, SAMPLE_INGREDIENT_DATA } from './data/sampleData';
import type { RevenueData, IngredientData } from './types';
import { processRevenueData, processIngredientData } from './utils/excelParser';
import { fetchGoogleSheetData } from './utils/googleSheets';
import { Calendar } from 'lucide-react';
import { CFOReportModal } from './components/CFOReportModal';

function App() {
  const [activeTab, setActiveTab] = useState<'management' | 'cost'>('management');

  // Raw Data (All uploaded data)
  const [allRevenueData, setAllRevenueData] = useState<RevenueData[]>([]);
  const [allIngredientData, setAllIngredientData] = useState<IngredientData[]>([]);

  // Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isReportVisible, setIsReportVisible] = useState(false);

  // Google Sheets URLs
  const [revenueSheetUrl, setRevenueSheetUrl] = useState(() => localStorage.getItem('revenueSheetUrl') || '');
  const [ingredientSheetUrl, setIngredientSheetUrl] = useState(() => localStorage.getItem('ingredientSheetUrl') || '');
  const [isCFOReportOpen, setIsCFOReportOpen] = useState(false);

  // Persist URLs
  useEffect(() => {
    localStorage.setItem('revenueSheetUrl', revenueSheetUrl);
  }, [revenueSheetUrl]);

  useEffect(() => {
    localStorage.setItem('ingredientSheetUrl', ingredientSheetUrl);
  }, [ingredientSheetUrl]);

  // Derived Min/Max dates from data
  const { minDate, maxDate } = useMemo(() => {
    const dates = [
      ...allRevenueData.map(d => d.date),
      ...allIngredientData.map(d => d.date)
    ].filter(d => d !== 'Unknown Date').sort();

    if (dates.length === 0) return { minDate: '', maxDate: '' };
    return { minDate: dates[0], maxDate: dates[dates.length - 1] };
  }, [allRevenueData, allIngredientData]);

  // Filtered Data for Display
  const filteredRevenueData = useMemo(() => {
    if (!startDate || !endDate) return allRevenueData;
    return allRevenueData.filter(d => {
      if (d.date === 'Unknown Date') return true;
      return d.date >= startDate && d.date <= endDate;
    });
  }, [allRevenueData, startDate, endDate]);

  const filteredIngredientData = useMemo(() => {
    if (!startDate || !endDate) return allIngredientData;
    return allIngredientData.filter(d => {
      if (d.date === 'Unknown Date') return true;
      return d.date >= startDate && d.date <= endDate;
    });
  }, [allIngredientData, startDate, endDate]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    [...allRevenueData, ...allIngredientData].forEach(d => {
      if (d.date && d.date !== 'Unknown Date') {
        years.add(d.date.substring(0, 4));
      }
    });
    return Array.from(years).sort();
  }, [allRevenueData, allIngredientData]);

  const handleGoogleSheetSync = async (url: string, type: 'revenue' | 'ingredient') => {
    if (!url) {
      alert('구글 시트 주소를 입력해주세요.');
      return;
    }

    try {
      const jsonData = await fetchGoogleSheetData(url);

      if (type === 'revenue') {
        const data = processRevenueData(jsonData);
        setAllRevenueData(data);
        if (data.length > 0) {
          const validDates = data.filter(d => d.date !== 'Unknown Date').map(d => d.date).sort();
          if (validDates.length > 0) {
            setStartDate(validDates[0]);
            setEndDate(validDates[validDates.length - 1]);
          }
        }
        setIsReportVisible(true);
        alert(`구글 시트에서 매출 데이터 ${data.length}건을 동기화했습니다.`);
      } else {
        const data = processIngredientData(jsonData);
        setAllIngredientData(data);
        setIsReportVisible(true);
        alert(`구글 시트에서 식자재 데이터 ${data.length}건을 동기화했습니다.`);
      }
    } catch (error) {
      alert('동기화 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };



  const loadSampleData = () => {
    setIsReportVisible(false);
    setAllRevenueData(SAMPLE_REVENUE_DATA);
    setAllIngredientData(SAMPLE_INGREDIENT_DATA);

    const dates = SAMPLE_REVENUE_DATA.map(d => d.date).sort();
    setStartDate(dates[0]);
    setEndDate(dates[dates.length - 1]);

    setIsReportVisible(true);
  };

  const handleApplyFilter = () => {
    if (!startDate || !endDate) {
      alert('시작일과 종료일을 선택해주세요. (전체 데이터가 표시됩니다)');
    }
    setIsReportVisible(true);
  };

  // Auto-set start/end date when new data loads if empty
  useMemo(() => {
    if (minDate && !startDate) setStartDate(minDate);
    if (maxDate && !endDate) setEndDate(maxDate);
  }, [minDate, maxDate]);

  const hasData = allRevenueData.length > 0 || allIngredientData.length > 0;

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100">
      {/* Sidebar */}
      <Sidebar

        onGoogleSheetSync={handleGoogleSheetSync}
        onUseSampleData={loadSampleData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        revenueSheetUrl={revenueSheetUrl}
        ingredientSheetUrl={ingredientSheetUrl}
        setRevenueSheetUrl={setRevenueSheetUrl}
        setIngredientSheetUrl={setIngredientSheetUrl}
      />

      {/* Main Content Area */}
      <main className="flex-1 transition-all duration-300 ease-in-out ml-[240px] p-8">
        {!hasData && (
          <header className="mb-8">
            <h2 className="text-3xl font-bold text-white">
              {activeTab === 'management' ? '종합 경영 보고서' : '식자재/운용용품 상세분석'}
            </h2>
            <p className="text-slate-400 mt-2">
              {activeTab === 'management'
                ? '영업 성과와 손익 현황을 한눈에 파악하세요.'
                : '식자재 지출 내역과 원가 효율성을 분석합니다.'}
            </p>
          </header>
        )}

        <div className="min-h-[500px]">
          {!hasData ? (
            <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 flex flex-col items-center justify-center h-[500px]">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-3xl">
                📊
              </div>
              <h3 className="text-xl font-bold text-slate-200">데이터가 없습니다</h3>
              <p className="text-slate-500 mt-2 text-center max-w-md">
                좌측 사이드바에서 엑셀 파일을 업로드하거나,<br />
                <b>'샘플 데이터로 체험하기'</b>를 클릭하여 분석을 시작해보세요.
              </p>
              <button
                onClick={loadSampleData}
                className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 hover:scale-105"
              >
                지금 바로 시작하기
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filter Section */}
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                minDate={minDate}
                maxDate={maxDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onApply={handleApplyFilter}
                availableYears={availableYears}
                onGenerateReport={() => setIsCFOReportOpen(true)}
              />

              <CFOReportModal
                isOpen={isCFOReportOpen}
                onClose={() => setIsCFOReportOpen(false)}
                revenueData={filteredRevenueData}
                ingredientData={filteredIngredientData}
                startDate={startDate}
                endDate={endDate}
              />

              <header className="mb-4">
                <h2 className="text-3xl font-bold text-white">
                  {activeTab === 'management' ? '종합 경영 보고서' : '식자재/운용용품 상세분석'}
                </h2>
                <p className="text-slate-400 mt-2">
                  {activeTab === 'management'
                    ? '영업 성과와 손익 현황을 한눈에 파악하세요.'
                    : '식자재 지출 내역과 원가 효율성을 분석합니다.'}
                </p>
              </header>

              {/* Reports - Only visible after applying filter */}
              {isReportVisible ? (
                <div className="animate-fade-in-up">
                  <div className={activeTab === 'management' ? 'block' : 'hidden'}>
                    {filteredRevenueData.length > 0 ? (
                      <Dashboard
                        data={filteredRevenueData}
                        startDate={startDate}
                        ingredientData={filteredIngredientData}
                      />
                    ) : (
                      <div className="text-center p-12 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
                        <p className="text-slate-400">선택한 기간에 해당하는 매출 데이터가 없습니다.</p>
                      </div>
                    )}
                  </div>
                  <div className={activeTab === 'cost' ? 'block' : 'hidden'}>
                    {filteredIngredientData.length > 0 ? (
                      <CostAnalysis data={filteredIngredientData} startDate={startDate} endDate={endDate} />
                    ) : (
                      <div className="text-center p-12 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
                        <p className="text-slate-400">선택한 기간에 해당하는 식자재 데이터가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center h-auto min-h-[400px] flex flex-col items-center justify-center animate-fade-in-up md:p-12">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-500 shadow-inner">
                    <Calendar size={32} />
                  </div>

                  <h3 className="text-xl font-bold text-slate-200 mb-2">데이터 로드 완료</h3>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                    성공적으로 파일을 분석했습니다.<br />
                    상단의 기간을 확인하고 <span className="font-bold text-blue-400">'분석 시작'</span> 버튼을 눌러주세요.
                  </p>

                  {/* Debug / Data Info Preview */}
                  <div className="w-full max-w-2xl bg-slate-800/50 rounded-lg border border-slate-700 p-6 text-left shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Data Status Preview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="text-xs text-slate-500 block mb-1">총 데이터 건수</span>
                        <span className="font-mono font-bold text-slate-200 text-lg">
                          {(activeTab === 'management' ? allRevenueData : allIngredientData).length}건
                        </span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                        <span className="text-xs text-slate-500 block mb-1">감지된 날짜 범위</span>
                        <span className="font-mono font-bold text-slate-200 text-sm">
                          {minDate || 'Unknown'} ~ {maxDate || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-800">
                      <p className="text-xs text-slate-500 mb-2">첫 번째 데이터 샘플 (Parsing Check):</p>
                      <pre className="text-[10px] text-green-400 font-mono leading-relaxed">
                        {JSON.stringify((activeTab === 'management' ? allRevenueData : allIngredientData)[0] || "데이터 없음 (Parsing Failed)", null, 2)}
                      </pre>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 text-right">
                      * 데이터가 보이지 않는다면 엑셀 파일의 헤더(첫 줄)를 확인해주세요.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
