import { X, Copy, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { RevenueData } from '../types';

interface DetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: RevenueData[];
    totalAmount: number;
    dateRange?: string;
}

export function DetailModal({ isOpen, onClose, title, data, totalAmount, dateRange }: DetailModalProps) {
    if (!isOpen) return null;

    // 날짜 오름차순 정렬 (과거 -> 최신)
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const copyToClipboard = () => {
        const header = ['날짜', '거래처', '구분', '금액', '결제수단', '세부내용'].join('\t');
        const rows = sortedData.map(d => [
            d.date,
            d.client || '-',
            d.category || (d.revenue > 0 ? '매출' : '지출'),
            d.revenue > 0 ? d.revenue : d.expense,
            d.paymentMethod || '-',
            d.memo || '-'
        ].join('\t'));
        const text = [header, ...rows].join('\n');

        navigator.clipboard.writeText(text).then(() => {
            alert('데이터가 복사되었습니다. 엑셀에 붙여넣기 하세요.');
        }).catch(err => {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다.');
        });
    };

    const exportToPDF = async () => {
        try {
            const doc = new jsPDF('l', 'mm', 'a4');

            // 한글 폰트 로드 (NanumGothic)
            try {
                const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf');
                if (response.ok) {
                    const blob = await response.blob();
                    const reader = new FileReader();

                    await new Promise((resolve, reject) => {
                        reader.onload = (e) => {
                            const result = e.target?.result as string;
                            // base64 문자열에서 헤더 제거 (data:font/ttf;base64, 부분)
                            const base64Font = result.split(',')[1];

                            doc.addFileToVFS('NanumGothic.ttf', base64Font);
                            doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
                            doc.setFont('NanumGothic');
                            resolve(null);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } else {
                    console.warn('폰트 다운로드 실패');
                }
            } catch (e) {
                console.warn('Font loading failed', e);
            }

            const tableColumn = ["날짜", "거래처", "구분", "금액", "결제수단", "세부내용"];

            // 데이터 31행씩 분할
            const rowsPerPage = 31;
            const chunks = [];
            for (let i = 0; i < sortedData.length; i += rowsPerPage) {
                chunks.push(sortedData.slice(i, i + rowsPerPage));
            }

            if (chunks.length === 0) return;

            // 각 페이지 생성
            chunks.forEach((chunk, index) => {
                if (index > 0) {
                    doc.addPage();
                }

                // 헤더 정보 (첫 페이지 혹은 매 페이지)
                doc.setFontSize(16);
                doc.setFont('NanumGothic'); // 헤더 폰트 적용
                doc.text(title, 14, 15);

                doc.setFontSize(10);
                doc.text(`기간: ${dateRange || '-'}`, 14, 22);
                doc.text(`총 ${data.length.toLocaleString()}건 / 합계: ${totalAmount.toLocaleString()}원`, 14, 27);

                const tableRows = chunk.map(d => [
                    d.date,
                    d.client || '-',
                    d.category || (d.revenue > 0 ? '매출' : '지출'),
                    (d.revenue > 0 ? d.revenue : d.expense).toLocaleString(),
                    d.paymentMethod || '-',
                    d.memo || '-'
                ]);

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 32,
                    styles: {
                        fontSize: 9,
                        cellPadding: 2,
                        font: 'NanumGothic', // 테이블 폰트 적용
                        fontStyle: 'normal'
                    },
                    headStyles: {
                        fillColor: [23, 37, 84],
                        font: 'NanumGothic'
                    },
                });
            });

            doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
            alert('PDF 저장이 완료되었습니다.');
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert('PDF 저장 중 오류가 발생했습니다.');
        }
    };

    // 월별 색상 구분을 위한 로직
    let currentMonth = '';
    let isLightBg = true;



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-700 overflow-hidden">

                {/* 헤더 (압축형) */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700 bg-slate-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-blue-400" />
                            <h3 className="font-bold text-white text-base">{title}</h3>
                        </div>
                        <div className="h-4 w-[1px] bg-slate-600 mx-1"></div>
                        <div className="flex items-center gap-3 text-xs font-medium">
                            <span className="text-slate-400">{dateRange}</span>
                            <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50">
                                총 {data.length.toLocaleString()}건
                            </span>
                            <div className="flex items-center gap-2 bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-600">
                                <span>합계: {totalAmount.toLocaleString()}원</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(totalAmount.toLocaleString());
                                        alert('합계 금액이 복사되었습니다.');
                                    }}
                                    className="hover:text-white transition-colors"
                                    title="합계 복사"
                                >
                                    <Copy size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 표 영역 (구글 시트 스타일 - 다크) */}
                <div className="flex-1 overflow-auto bg-slate-900 customize-scrollbar">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                        <thead className="sticky top-0 z-10 shadow-sm shadow-black/20">
                            <tr className="bg-slate-800 border-b border-slate-700 text-[12px] text-slate-400 font-bold">
                                <th className="px-4 py-2 border-r border-slate-700 w-[120px]">날짜</th>
                                <th className="px-4 py-2 border-r border-slate-700 w-[180px]">거래처</th>
                                <th className="px-4 py-2 border-r border-slate-700 w-[120px]">구분</th>
                                <th className="px-4 py-2 border-r border-slate-700 w-[150px] text-right">금액</th>
                                <th className="px-4 py-2 border-r border-slate-700 w-[150px]">결제수단</th>
                                <th className="px-4 py-2">세부내용</th>
                            </tr>
                        </thead>
                        <tbody className="text-[13px] text-slate-300 font-medium">
                            {sortedData.map((row, idx) => {
                                const amount = row.revenue > 0 ? row.revenue : row.expense;
                                const type = row.category || (row.revenue > 0 ? '매출' : '지출');

                                // 월 변경 감지 로직
                                const rowMonth = row.date.substring(0, 7); // "YYYY-MM"
                                if (currentMonth !== rowMonth) {
                                    currentMonth = rowMonth;
                                    isLightBg = !isLightBg;
                                }

                                return (
                                    <tr
                                        key={idx}
                                        className={`border-b border-slate-800 hover:bg-blue-900/20 transition-colors ${isLightBg ? 'bg-slate-900' : 'bg-slate-800/30'
                                            }`}
                                    >
                                        <td className="px-4 py-1.5 border-r border-slate-800 font-mono text-slate-500">{row.date}</td>
                                        <td className="px-4 py-1.5 border-r border-slate-800 truncate font-semibold text-slate-200" title={row.client}>{row.client || '-'}</td>
                                        <td className="px-4 py-1.5 border-r border-slate-800">
                                            <span className={`${row.revenue > 0 ? 'text-blue-400' : 'text-rose-400'
                                                }`}>
                                                {type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-1.5 border-r border-slate-800 text-right font-bold tabular-nums text-slate-200">
                                            {amount.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-1.5 border-r border-slate-800 text-slate-500 text-xs">{row.paymentMethod || '-'}</td>
                                        <td className="px-4 py-1.5 truncate text-slate-400" title={row.memo}>{row.memo || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 푸터 (압축형) */}
                <div className="px-6 py-3 border-t border-slate-700 bg-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold">총 건수:</span>
                            <span className="font-bold text-white">{data.length.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold">총 합계:</span>
                            <span className="font-black text-blue-400 text-lg">{totalAmount.toLocaleString()}원</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 px-4 py-1.5 bg-orange-600 border border-orange-500 hover:bg-orange-500 text-white rounded text-sm font-bold shadow-sm transition-all"
                        >
                            <Download size={16} />
                            PDF 저장
                        </button>
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200 rounded text-sm font-bold shadow-sm transition-all"
                        >
                            <Copy size={16} />
                            엑셀로 복사
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-1.5 bg-slate-950 hover:bg-black text-white rounded text-sm font-bold shadow-sm border border-slate-800 transition-all"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
