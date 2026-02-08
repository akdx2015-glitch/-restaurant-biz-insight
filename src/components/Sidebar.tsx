import { Database, RefreshCw, X } from 'lucide-react';

interface SidebarProps {
    onGoogleSheetSync: (url: string, type: 'revenue' | 'ingredient') => void;
    onUseSampleData: () => void;
    activeTab: 'management' | 'cost';
    setActiveTab: (tab: 'management' | 'cost') => void;
    revenueSheetUrl: string;
    ingredientSheetUrl: string;
    setRevenueSheetUrl: (url: string) => void;
    setIngredientSheetUrl: (url: string) => void;
}

export function Sidebar({
    onGoogleSheetSync,
    onUseSampleData,
    activeTab,
    setActiveTab,
    revenueSheetUrl,
    ingredientSheetUrl,
    setRevenueSheetUrl,
    setIngredientSheetUrl
}: SidebarProps) {

    return (
        <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                    Biz Insight
                </h1>
                <p className="text-xs text-slate-400 mt-1">AI 식당 경영 솔루션</p>
            </div>

            <div className="p-4 space-y-6">
                {/* Navigation */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reports</p>
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${activeTab === 'management'
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Database size={18} />
                        <span>종합 경영 보고서</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('cost')}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${activeTab === 'cost'
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Database size={18} />
                        <span>식자재/운용용품 상세분석</span>
                    </button>
                </div>

                {/* Data Source Zone */}
                <div className="space-y-6 pt-6 border-t border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Data Source (Google Sheets)</p>

                    {/* Revenue Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold">매출/지출 데이터</span>
                            </div>
                            {revenueSheetUrl && (
                                <button
                                    onClick={() => setRevenueSheetUrl('')}
                                    className="text-slate-500 hover:text-white transition-colors"
                                    title="주소 지우기"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-2">
                            <input
                                type="text"
                                placeholder="여기에 시트 주소를 입력하세요..."
                                value={revenueSheetUrl}
                                onChange={(e) => setRevenueSheetUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={() => onGoogleSheetSync(revenueSheetUrl, 'revenue')}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                <RefreshCw size={14} />
                                매출 데이터 동기화
                            </button>
                        </div>
                    </div>

                    {/* Ingredient Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold">식자재/물품 데이터</span>
                            </div>
                            {ingredientSheetUrl && (
                                <button
                                    onClick={() => setIngredientSheetUrl('')}
                                    className="text-slate-500 hover:text-white transition-colors"
                                    title="주소 지우기"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-2">
                            <input
                                type="text"
                                placeholder="여기에 시트 주소를 입력하세요..."
                                value={ingredientSheetUrl}
                                onChange={(e) => setIngredientSheetUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-orange-500"
                            />
                            <button
                                onClick={() => onGoogleSheetSync(ingredientSheetUrl, 'ingredient')}
                                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
                            >
                                <RefreshCw size={14} />
                                식자재 데이터 동기화
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 mt-auto">
                <button
                    onClick={onUseSampleData}
                    className="w-full py-2.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium hover:text-white hover:bg-slate-700 transition-colors"
                >
                    샘플 데이터로 체험하기
                </button>
            </div>
        </div>
    );
}
