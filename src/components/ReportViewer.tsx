import { useState } from 'react';
import { X, Copy, RefreshCw, FileText, ChevronRight, ChevronLeft, Download, FileImage } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { RevenueData } from '../types';

interface ReportViewerProps {
    isOpen: boolean;
    onClose: () => void;
    data: RevenueData[];
    dateRange: string;
}

export function ReportViewer({ isOpen, onClose, data, dateRange }: ReportViewerProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const totalPages = 6;

    if (!isOpen) return null;

    // === 데이터 분석 ===
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
    const netProfit = totalRevenue - totalExpense;

    const revenueByClient = Object.values(
        data.filter(d => d.revenue > 0 && d.client).reduce((acc, d) => {
            const clientName = d.client || '기타';
            if (!acc[clientName]) acc[clientName] = { name: clientName, value: 0 };
            acc[clientName].value += d.revenue;
            return acc;
        }, {} as Record<string, { name: string; value: number }>)
    ).sort((a, b) => b.value - a.value);

    const expenseByClient = Object.values(
        data.filter(d => d.expense > 0 && d.client).reduce((acc, d) => {
            const clientName = d.client || '기타';
            if (!acc[clientName]) acc[clientName] = { name: clientName, value: 0 };
            acc[clientName].value += d.expense;
            return acc;
        }, {} as Record<string, { name: string; value: number }>)
    ).sort((a, b) => b.value - a.value);

    const dailyData = Object.values(
        data.reduce((acc, d) => {
            if (!acc[d.date]) acc[d.date] = { date: d.date, revenue: 0, expense: 0 };
            acc[d.date].revenue += d.revenue;
            acc[d.date].expense += d.expense;
            return acc;
        }, {} as Record<string, { date: string; revenue: number; expense: number }>)
    ).sort((a, b) => a.date.localeCompare(b.date));

    const maxDaily = Math.max(...dailyData.map(d => Math.max(d.revenue, d.expense)));

    const categoryExpenses = Object.values(
        data.filter(d => d.expense > 0 && d.category).reduce((acc, d) => {
            const cat = d.category || '기타';
            if (!acc[cat]) acc[cat] = { name: cat, value: 0 };
            acc[cat].value += d.expense;
            return acc;
        }, {} as Record<string, { name: string; value: number }>)
    ).sort((a, b) => b.value - a.value);

    const variableCost = categoryExpenses.filter(c =>
        ['식자재', '주류', '인건비', '수도광열', '운영용품', '배달'].some(k => c.name.includes(k))
    ).reduce((sum, c) => sum + c.value, 0);
    const fixedCost = categoryExpenses.filter(c =>
        ['임대', '세금', '보험', '통신', '용역', '금융'].some(k => c.name.includes(k))
    ).reduce((sum, c) => sum + c.value, 0);
    const otherCost = totalExpense - variableCost - fixedCost;

    // SVG 차트 생성 함수들
    const generateBarChart = (items: { name: string; value: number }[], total: number, color: string, maxItems = 10) => {
        const chartItems = items.slice(0, maxItems);
        const barHeight = 20;
        const chartHeight = chartItems.length * (barHeight + 8);

        return `
        <svg width="100%" height="${chartHeight}" style="background: #f8fafc; border-radius: 8px; padding: 10px;">
            ${chartItems.map((item, idx) => {
            const barWidth = (item.value / total * 100);
            const y = idx * (barHeight + 8);
            return `
                    <g>
                        <text x="0" y="${y + 15}" font-size="9" fill="#1f2937" font-weight="bold">${item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}</text>
                        <rect x="140" y="${y}" width="${barWidth * 4.5}px" height="${barHeight}" fill="${color}" rx="3"/>
                        <text x="${140 + barWidth * 4.5 + 5}" y="${y + 15}" font-size="8" fill="#1f2937">${item.value.toLocaleString()}원 (${(item.value / total * 100).toFixed(1)}%)</text>
                    </g>
                `;
        }).join('')}
        </svg>
        `;
    };

    const generateLineChart = (items: { date: string; revenue: number; expense: number }[], maxValue: number) => {
        const chartItems = items.slice(-10);
        const chartWidth = 500;
        const chartHeight = 120;
        const padding = 20;
        const barWidth = (chartWidth - padding * 2) / chartItems.length / 2;

        return `
        <svg width="100%" height="${chartHeight + 40}" style="background: #f8fafc; border-radius: 8px; padding: 10px;">
            <!-- Grid lines -->
            ${[0, 25, 50, 75, 100].map(pct => `
                <line x1="${padding}" y1="${chartHeight - (chartHeight * pct / 100)}" x2="${chartWidth}" y2="${chartHeight - (chartHeight * pct / 100)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2,2"/>
            `).join('')}
            
            <!-- Bars -->
            ${chartItems.map((item, idx) => {
            const x = padding + idx * barWidth * 2;
            const revenueH = maxValue > 0 ? (item.revenue / maxValue * (chartHeight - padding)) : 0;
            const expenseH = maxValue > 0 ? (item.expense / maxValue * (chartHeight - padding)) : 0;
            return `
                    <rect x="${x}" y="${chartHeight - revenueH}" width="${barWidth - 2}" height="${revenueH}" fill="#22c55e" rx="2"/>
                    <rect x="${x + barWidth}" y="${chartHeight - expenseH}" width="${barWidth - 2}" height="${expenseH}" fill="#ef4444" rx="2"/>
                    <text x="${x + barWidth}" y="${chartHeight + 15}" font-size="7" fill="#64748b" text-anchor="middle" transform="rotate(-45 ${x + barWidth} ${chartHeight + 15})">${item.date.substring(5)}</text>
                `;
        }).join('')}
            
            <!-- Legend -->
            <rect x="${chartWidth - 100}" y="10" width="12" height="12" fill="#22c55e"/>
            <text x="${chartWidth - 85}" y="20" font-size="9" fill="#1f2937">매출</text>
            <rect x="${chartWidth - 100}" y="25" width="12" height="12" fill="#ef4444"/>
            <text x="${chartWidth - 85}" y="35" font-size="9" fill="#1f2937">지출</text>
        </svg>
        `;
    };

    const generatePieChart = (segments: { name: string; value: number; color: string }[], total: number) => {
        let currentAngle = 0;
        const radius = 60;
        const cx = 80;
        const cy = 80;

        const pathSegments = segments.map(seg => {
            const percentage = total > 0 ? (seg.value / total) : 0;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;

            const x1 = cx + radius * Math.cos(startRad);
            const y1 = cy + radius * Math.sin(startRad);
            const x2 = cx + radius * Math.cos(endRad);
            const y2 = cy + radius * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${seg.color}" stroke="#fff" stroke-width="2"/>`;
        }).join('\n');

        return `
        <svg width="180" height="180" style="display: inline-block; vertical-align: top;">
            ${pathSegments}
            <circle cx="${cx}" cy="${cy}" r="30" fill="#fff"/>
            <text x="${cx}" y="${cy + 5}" font-size="10" fill="#1f2937" text-anchor="middle" font-weight="bold">총 지출</text>
        </svg>
        <div style="display: inline-block; vertical-align: top; margin-left: 20px;">
            ${segments.map(seg => `
                <div style="margin: 8px 0; font-size: 9pt;">
                    <span style="display: inline-block; width: 14px; height: 14px; background: ${seg.color}; border-radius: 3px; margin-right: 6px; vertical-align: middle;"></span>
                    <strong>${seg.name}:</strong> ${seg.value.toLocaleString()}원 (${total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%)
                </div>
            `).join('')}
        </div>
        `;
    };

    // HTML 생성
    const generateReportHTML = () => {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Malgun Gothic', sans-serif; font-size: 9pt; line-height: 1.3; color: #1f2937; margin: 0; padding: 0; }
        h1 { font-size: 16pt; font-weight: bold; color: #1e40af; margin: 0 0 6px 0; border-bottom: 3px solid #3b82f6; padding-bottom: 4px; }
        h2 { font-size: 12pt; font-weight: bold; color: #1e40af; margin: 12px 0 6px 0; padding-left: 6px; border-left: 4px solid #3b82f6; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 8pt; }
        th, td { border: 1px solid #cbd5e1; padding: 4px; text-align: left; color: #1f2937; }
        th { background-color: #f1f5f9; font-weight: bold; color: #1e40af; }
        .kpi-container { display: flex; gap: 8px; margin: 10px 0; }
        .kpi-box { flex: 1; padding: 8px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #cbd5e1; border-radius: 6px; text-align: center; }
        .kpi-label { font-size: 8pt; color: #64748b; display: block; margin-bottom: 2px; }
        .kpi-value { font-size: 13pt; font-weight: bold; color: #1e40af; }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        .insight-box { background: #eff6ff; padding: 10px; border-left: 4px solid #3b82f6; margin: 10px 0; font-size: 8pt; }
        .page-break { page-break-after: always; }
        .footer { text-align: right; color: #94a3b8; margin-top: 15px; font-size: 7pt; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    </style>
</head>
<body>
    <!-- 페이지 1: 표지 -->
    <div style="text-align: center; padding: 80px 0;">
        <h1 style="font-size: 28pt; border: none; margin-bottom: 20px;">📊 경영 분석 종합 보고서</h1>
        <p style="font-size: 14pt; color: #64748b; margin: 20px 0;">분석 기간: ${dateRange}</p>
        <p style="font-size: 12pt; color: #94a3b8;">데이터 건수: ${data.length.toLocaleString()}건</p>
        
        <div style="margin-top: 60px; padding: 30px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px;">
            <h2 style="border: none; padding: 0; margin-bottom: 20px; color: #1e40af;">핵심 경영 지표</h2>
            <div class="kpi-container" style="max-width: 600px; margin: 0 auto;">
                <div class="kpi-box">
                    <span class="kpi-label">총 매출</span>
                    <span class="kpi-value positive" style="font-size: 18pt;">${totalRevenue.toLocaleString()}원</span>
                </div>
                <div class="kpi-box">
                    <span class="kpi-label">총 지출</span>
                    <span class="kpi-value negative" style="font-size: 18pt;">${totalExpense.toLocaleString()}원</span>
                </div>
            </div>
            <div class="kpi-container" style="max-width: 600px; margin: 20px auto 0;">
                <div class="kpi-box">
                    <span class="kpi-label">순이익</span>
                    <span class="kpi-value ${netProfit >= 0 ? 'positive' : 'negative'}" style="font-size: 18pt;">${netProfit.toLocaleString()}원</span>
                </div>
                <div class="kpi-box">
                    <span class="kpi-label">순이익률</span>
                    <span class="kpi-value ${netProfit >= 0 ? 'positive' : 'negative'}" style="font-size: 18pt;">${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</span>
                </div>
            </div>
        </div>
    </div>
    <div class="footer">페이지 1 / ${totalPages}</div>
    <div class="page-break"></div>

    <!-- 페이지 2: 일별 추이 차트 -->
    <h1>📈 일별 매출/지출 추이 분석</h1>
    
    <h2>1. 추이 차트 (최근 10일)</h2>
    <div style="margin: 10px 0;">
        ${generateLineChart(dailyData, maxDaily)}
    </div>

    <h2>2. 일별 상세 데이터</h2>
    <table>
        <thead>
            <tr>
                <th>날짜</th>
                <th style="text-align: right;">매출 (원)</th>
                <th style="text-align: right;">지출 (원)</th>
                <th style="text-align: right;">순이익 (원)</th>
                <th style="text-align: right;">순이익률 (%)</th>
            </tr>
        </thead>
        <tbody>
            ${dailyData.map(d => `
            <tr>
                <td>${d.date}</td>
                <td style="text-align: right; color: #16a34a; font-weight: bold;">${d.revenue.toLocaleString()}</td>
                <td style="text-align: right; color: #dc2626; font-weight: bold;">${d.expense.toLocaleString()}</td>
                <td style="text-align: right; font-weight: bold; ${(d.revenue - d.expense) >= 0 ? 'color: #16a34a;' : 'color: #dc2626;'}">${(d.revenue - d.expense).toLocaleString()}</td>
                <td style="text-align: right;">${d.revenue > 0 ? (((d.revenue - d.expense) / d.revenue) * 100).toFixed(1) : 0}%</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">페이지 2 / ${totalPages}</div>
    <div class="page-break"></div>

    <!-- 페이지 3: 거래처별 매출 -->
    <h1>💰 거래처별 매출 분석</h1>
    
    <div class="insight-box">
        <strong>🏆 주요 매출처:</strong> ${revenueByClient[0]?.name || 'N/A'}가 전체 매출의 ${revenueByClient[0] ? ((revenueByClient[0].value / totalRevenue) * 100).toFixed(1) : 0}%를 차지합니다.
    </div>

    <h2>1. 매출 비중 차트 (TOP 10)</h2>
    ${generateBarChart(revenueByClient, totalRevenue, '#22c55e', 10)}

    <h2>2. 거래처별 매출 상세</h2>
    <table>
        <thead>
            <tr>
                <th>순위</th>
                <th>거래처</th>
                <th style="text-align: right;">매출액 (원)</th>
                <th style="text-align: right;">비중 (%)</th>
            </tr>
        </thead>
        <tbody>
            ${revenueByClient.slice(0, 15).map((item, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td style="text-align: right; font-weight: bold; color: #16a34a;">${item.value.toLocaleString()}</td>
                <td style="text-align: right;">${((item.value / totalRevenue) * 100).toFixed(1)}%</td>
            </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2">총 매출</td>
                <td style="text-align: right; color: #16a34a;">${totalRevenue.toLocaleString()}</td>
                <td style="text-align: right;">100.0%</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">페이지 3 / ${totalPages}</div>
    <div class="page-break"></div>

    <!-- 페이지 4: 거래처별 지출 -->
    <h1>💸 거래처별 지출 분석</h1>
    
    <div class="insight-box">
        <strong>💰 주요 비용처:</strong> ${expenseByClient[0]?.name || 'N/A'}가 전체 지출의 ${expenseByClient[0] ? ((expenseByClient[0].value / totalExpense) * 100).toFixed(1) : 0}%를 차지합니다.
    </div>

    <h2>1. 지출 비중 차트 (TOP 10)</h2>
    ${generateBarChart(expenseByClient, totalExpense, '#ef4444', 10)}

    <h2>2. 거래처별 지출 상세</h2>
    <table>
        <thead>
            <tr>
                <th>순위</th>
                <th>거래처</th>
                <th style="text-align: right;">지출액 (원)</th>
                <th style="text-align: right;">비중 (%)</th>
            </tr>
        </thead>
        <tbody>
            ${expenseByClient.slice(0, 15).map((item, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td style="text-align: right; font-weight: bold; color: #dc2626;">${item.value.toLocaleString()}</td>
                <td style="text-align: right;">${((item.value / totalExpense) * 100).toFixed(1)}%</td>
            </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: bold;">
                <td colspan="2">총 지출</td>
                <td style="text-align: right; color: #dc2626;">${totalExpense.toLocaleString()}</td>
                <td style="text-align: right;">100.0%</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">페이지 4 / ${totalPages}</div>
    <div class="page-break"></div>

    <!-- 페이지 5: 카테고리별 지출 -->
    <h1>📊 카테고리별 지출 분석</h1>
    
    <h2>1. 카테고리별 지출 비중 차트</h2>
    ${generateBarChart(categoryExpenses, totalExpense, '#3b82f6', 15)}

    <h2>2. 카테고리별 지출 상세</h2>
    <table>
        <thead>
            <tr>
                <th>순위</th>
                <th>카테고리</th>
                <th style="text-align: right;">지출액 (원)</th>
                <th style="text-align: right;">비중 (%)</th>
            </tr>
        </thead>
        <tbody>
            ${categoryExpenses.map((item, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td style="text-align: right; font-weight: bold; color: #2563eb;">${item.value.toLocaleString()}</td>
                <td style="text-align: right;">${((item.value / totalExpense) * 100).toFixed(1)}%</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">페이지 5 / ${totalPages}</div>
    <div class="page-break"></div>

    <!-- 페이지 6: 변동비/고정비 및 인사이트 -->
    <h1>🔍 변동비/고정비 분석 및 경영 인사이트</h1>
    
    <h2>1. 변동비 vs 고정비 구조</h2>
    <div style="margin: 15px 0;">
        ${generatePieChart([
            { name: '변동비', value: variableCost, color: '#ef4444' },
            { name: '고정비', value: fixedCost, color: '#3b82f6' },
            { name: '기타', value: otherCost, color: '#94a3b8' }
        ], totalExpense)}
    </div>

    <h2>2. 종합 인사이트</h2>
    <div class="insight-box">
        <h3 style="margin-top: 0;">📌 주요 발견사항</h3>
        <ul style="margin: 6px 0; padding-left: 18px;">
            <li><strong>순이익률:</strong> ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}% (${netProfit >= 0 ? '흑자' : '적자'})</li>
            <li><strong>주요 매출처:</strong> ${revenueByClient[0]?.name || 'N/A'} (${revenueByClient[0] ? ((revenueByClient[0].value / totalRevenue) * 100).toFixed(1) : 0}%)</li>
            <li><strong>주요 비용처:</strong> ${expenseByClient[0]?.name || 'N/A'} (${expenseByClient[0] ? ((expenseByClient[0].value / totalExpense) * 100).toFixed(1) : 0}%)</li>
            <li><strong>비용 구조:</strong> 변동비 ${totalExpense > 0 ? ((variableCost / totalExpense) * 100).toFixed(1) : 0}%, 고정비 ${totalExpense > 0 ? ((fixedCost / totalExpense) * 100).toFixed(1) : 0}%</li>
        </ul>
        
        <h3>💡 개선 권장사항</h3>
        <ul style="margin: 6px 0; padding-left: 18px;">
            ${netProfit < 0 ? '<li><strong style="color: #dc2626;">[긴급]</strong> 현재 적자 상태입니다. 지출 절감이 필요합니다.</li>' : ''}
            ${totalExpense > 0 && (variableCost / totalExpense) > 0.6 ? '<li>변동비 비중이 높습니다. 구매 단가 협상을 고려하세요.</li>' : ''}
            ${revenueByClient[0] && ((revenueByClient[0].value / totalRevenue) > 0.5) ? '<li>특정 거래처 의존도가 높습니다. 매출처 다변화가 필요합니다.</li>' : ''}
            <li>정기적인 경영 분석을 통해 비즈니스 트렌드를 파악하세요.</li>
        </ul>
    </div>

    <div class="footer">
        작성일: ${new Date().toLocaleDateString('ko-KR')} | 자동 생성 | 페이지 ${totalPages} / ${totalPages}
    </div>
</body>
</html>
        `.trim();
    };

    // 옵션 1: PDF 다운로드
    const downloadPDF = () => {
        window.print();
    };

    // 옵션 2: Word 파일로 저장
    const downloadWord = () => {
        const htmlContent = generateReportHTML();
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `경영분석보고서_${new Date().toLocaleDateString('ko-KR')}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Word 파일로 다운로드되었습니다!');
    };

    // 옵션 3: 각 페이지를 이미지로 저장
    const downloadImages = async () => {
        try {
            const reportElement = document.querySelector('[data-page-content]') as HTMLElement;
            if (!reportElement) {
                alert('보고서 요소를 찾을 수 없습니다.');
                return;
            }

            for (let i = 1; i <= totalPages; i++) {
                setCurrentPage(i);
                await new Promise(resolve => setTimeout(resolve, 300));

                const canvas = await html2canvas(reportElement, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                const imgData = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = imgData;
                link.download = `보고서_페이지${i}_${new Date().toLocaleDateString('ko-KR')}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                await new Promise(resolve => setTimeout(resolve, 200));
            }

            setCurrentPage(1);
            alert(`${totalPages}장의 이미지가 모두 다운로드되었습니다!`);
        } catch (err) {
            console.error('이미지 저장 실패:', err);
            alert('이미지 저장에 실패했습니다.');
        }
    };

    const copyToClipboard = async () => {
        try {
            const htmlContent = generateReportHTML();
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([clipboardItem]);
            alert('보고서가 클립보드에 복사되었습니다!\nGoogle Docs에 붙여넣기(Ctrl+V) 하세요.');
        } catch (err) {
            console.error('복사 실패:', err);
            alert('복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
        }
    };

    const regenerateReport = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setCurrentPage(1);
            alert('보고서가 재생성되었습니다!');
        }, 500);
    };

    const getPageContent = (page: number) => {
        const fullHTML = generateReportHTML();
        const pages = fullHTML.split('<div class="page-break"></div>');

        if (page === 1) {
            return pages[0] + '</body></html>';
        } else if (page <= totalPages) {
            const headContent = fullHTML.split('</head>')[0].split('<head>')[1];
            return '<html><head>' + headContent + '</head><body>' + pages[page - 1];
        }
        return '';
    };

    return (
        <div className="fixed inset-0 z-50 flex bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-48 bg-slate-800 border-r border-slate-700 p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-6 text-white">
                    <FileText size={20} />
                    <h3 className="font-bold text-sm">페이지</h3>
                </div>
                <div className="space-y-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            <span className="text-sm font-medium">페이지 {page}</span>
                            {currentPage === page && <ChevronRight size={16} />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText size={20} className="text-blue-400" />
                        <h2 className="text-white font-bold">경영 분석 종합 보고서</h2>
                        <span className="text-slate-400 text-sm">({dateRange})</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-700 p-8">
                    <div
                        data-page-content
                        className="mx-auto bg-white shadow-2xl text-[#1f2937]"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '12mm',
                        }}
                        dangerouslySetInnerHTML={{ __html: getPageContent(currentPage) }}
                    />
                </div>

                <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors disabled:opacity-30"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-slate-400 text-sm">
                            페이지 {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-slate-700 rounded text-slate-300 transition-colors disabled:opacity-30"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={regenerateReport}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium shadow transition-all disabled:opacity-50 text-sm"
                        >
                            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
                            다시 생성
                        </button>
                        <button
                            onClick={downloadPDF}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-lg transition-all text-sm"
                            title="PDF로 다운로드 (인쇄)"
                        >
                            <FileText size={14} />
                            PDF
                        </button>
                        <button
                            onClick={downloadWord}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-lg transition-all text-sm"
                            title="Word 파일로 저장"
                        >
                            <Download size={14} />
                            Word
                        </button>
                        <button
                            onClick={downloadImages}
                            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow-lg transition-all text-sm"
                            title="각 페이지를 이미지로 저장"
                        >
                            <FileImage size={14} />
                            이미지
                        </button>
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium shadow transition-all text-sm"
                            title="HTML 클립보드 복사"
                        >
                            <Copy size={14} />
                            복사
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded font-medium shadow transition-all text-sm"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
