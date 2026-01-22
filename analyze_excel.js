const XLSX = require('xlsx');

const wb = XLSX.readFile('src/data/식자재 운용용품 마스터시트 (1).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('=== 엑셀 파일 분석 ===\n');
console.log('총 데이터:', data.length, '행\n');
console.log('컬럼명:');
Object.keys(data[0]).forEach((col, i) => {
    console.log(`  ${i + 1}. ${col}`);
});

console.log('\n=== 샘플 데이터 (처음 3행) ===\n');
data.slice(0, 3).forEach((row, i) => {
    console.log(`[행 ${i + 1}]`);
    Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
    console.log('');
});

// 대분류 및 중분류 값들 확인
const categories = [...new Set(data.map(r => r['대분류']).filter(Boolean))];
const subCategories = [...new Set(data.map(r => r['중분류']).filter(Boolean))];

console.log('\n=== 대분류 목록 ===');
console.log(categories.join(', '));

console.log('\n=== 중분류 목록 (처음 20개) ===');
console.log(subCategories.slice(0, 20).join(', '));
