const fs = require('fs');
const path = 'C:/Users/akdx2/OneDrive/Desktop/경영분석보고서/src/components/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Use a more generic regex for the function body to avoid whitespace issues
const target = /const getCatColor = \(name: string\) => \{[\s\S]*?\n\s*\};/;
const replacement = `const getCatColor = (name: string) => {
                            const allUniqueNames = summaryPieData.map((d: any) => d.name);
                            const totalCount = allUniqueNames.length;
                            const idx = allUniqueNames.indexOf(name);
                            if (idx === -1) return '#6b7280';
                            if (totalCount > COLORS.length && idx >= totalCount - 2) {
                                return COLORS[COLORS.length - 1];
                            }
                            return COLORS[idx % COLORS.length];
                        };`;

if (target.test(content)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated Dashboard.tsx');
} else {
    console.error('Failed to find target in Dashboard.tsx');
    process.exit(1);
}
