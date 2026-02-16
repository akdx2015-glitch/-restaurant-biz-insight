import { useRef } from 'react';
import { X, Download, FileText, Calendar, DollarSign, Package } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { CostPurchaseData } from '../types';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemName: string;
    data: CostPurchaseData[];
}

export function ItemDetailModal({ isOpen, onClose, itemName, data }: ItemDetailModalProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    // 날짜 내림차순 정렬
    const sortedData = [...data].sort((a, b) => {
        const dateA = new Date(a.날짜 || '1970-01-01').getTime();
        const dateB = new Date(b.날짜 || '1970-01-01').getTime();
        return dateB - dateA;
    });

    const totalQuantity = sortedData.reduce((sum, item) => sum + (item.수량 || 0), 0);
    const totalAmount = sortedData.reduce((sum, item) => sum + (item.합계금액 || 0), 0);
    const avgPrice = totalQuantity > 0 ? Math.round(totalAmount / totalQuantity) : 0;

    const handlePdfPreview = async () => {
        if (!contentRef.current) return;

        try {
            const canvas = await html2canvas(contentRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            window.open(pdf.output('bloburl'), '_blank');
        } catch (error) {
            console.error('PDF Preview failed:', error);
            alert('PDF 미리보기를 생성하는 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Package className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{itemName}</h3>
                            <p className="text-xs text-slate-400">총 {sortedData.length}건의 거래 내역</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePdfPreview}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-red-900/20"
                        >
                            <FileText size={14} />
                            PDF 미리보기
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Area (Scrollable) */}
                <div className="flex-1 overflow-auto p-6 bg-slate-900 personalize-scrollbar">

                    {/* PDF Capture Target */}
                    <div ref={contentRef} className="bg-white text-slate-900 p-8 rounded-none min-h-[500px]">

                        <div className="flex justify-between items-end mb-6 border-b-2 border-slate-900 pb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">물품 거래 내역서</h1>
                                <p className="text-sm text-slate-500 mt-1">Item Transaction History</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-900">품목명: {itemName}</p>
                                <p className="text-xs text-slate-500">출력일자: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">총 구매수량</p>
                                <p className="text-xl font-bold text-blue-600">{totalQuantity.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">총 구매금액</p>
                                <p className="text-xl font-bold text-red-600">{totalAmount.toLocaleString()}원</p>
                            </div>
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-center">
                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">평균 단가</p>
                                <p className="text-xl font-bold text-slate-700">{avgPrice.toLocaleString()}원</p>
                            </div>
                        </div>

                        {/* Transaction Table */}
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="py-2 px-3 text-left w-[120px]">날짜</th>
                                    <th className="py-2 px-3 text-left">거래처</th>
                                    <th className="py-2 px-3 text-left">규격</th>
                                    <th className="py-2 px-3 text-right">수량</th>
                                    <th className="py-2 px-3 text-right">단가</th>
                                    <th className="py-2 px-3 text-right">합계금액</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                                        <td className="py-2 px-3 text-slate-600 font-mono">{item.날짜}</td>
                                        <td className="py-2 px-3 font-semibold text-slate-800">{item.거래처}</td>
                                        <td className="py-2 px-3 text-slate-500 text-xs">{item.규격 || '-'}</td>
                                        <td className="py-2 px-3 text-right font-mono">{item.수량?.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-500">{item.단가?.toLocaleString()}</td>
                                        <td className="py-2 px-3 text-right font-bold text-slate-900">{item.합계금액?.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {sortedData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                            거래 내역이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td colSpan={3} className="py-3 px-3 text-center">합계</td>
                                    <td className="py-3 px-3 text-right">{totalQuantity.toLocaleString()}</td>
                                    <td className="py-3 px-3 text-right">-</td>
                                    <td className="py-3 px-3 text-right text-red-600">{totalAmount.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                            <p className="text-xs text-slate-400">
                                * 본 문서는 경영 분석용으로 생성되었으며, 실제 회계 증빙과는 차이가 있을 수 있습니다. <br />
                                (생성일시: {new Date().toLocaleString()})
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
