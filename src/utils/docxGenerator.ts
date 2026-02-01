import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

/**
 * Markdown 텍스트를 분석하여 Word 문서 객체로 변환하고 다운로드합니다.
 * @param markdownContent 보고서 Markdown 텍스트
 * @param fileName 저장할 파일명
 */
export const exportToJsxWord = async (markdownContent: string, fileName: string = "CFO_Report.docx") => {
    const lines = markdownContent.split('\n');
    const children: (Paragraph | Table)[] = [];

    let tableBuffer: string[] = [];

    const processTableBuffer = () => {
        if (tableBuffer.length === 0) return;

        // Parse table
        // Remove alignment row (second row usually) if exists
        const headerRowIndex = 0;
        let dataRows = tableBuffer;

        // Check for separator row (e.g., |---|---|)
        if (tableBuffer.length > 1 && tableBuffer[1].trim().includes('---')) {
            dataRows = [tableBuffer[0], ...tableBuffer.slice(2)];
        }

        const rows = dataRows.map((line, rowIndex) => {
            const cells = line.split('|').filter(cell => cell.trim() !== ''); // 빈 문자열 제거 (양 끝)
            // If line started/ended with |, split might give empty first/last elements. 
            // Better parsing:
            const rawCells = line.split('|');
            // Usually markdown tables have empty first and last split result if they start/end with |
            const tableCells = rawCells.slice(1, -1).map(c => c.trim());

            return new TableRow({
                children: tableCells.map(cellText => {
                    return new TableCell({
                        children: [new Paragraph({
                            children: [new TextRun({
                                text: cellText,
                                bold: rowIndex === 0, // Header bold
                                size: 20, // 10pt
                            })],
                            alignment: AlignmentType.CENTER
                        })],
                        width: {
                            size: 100 / tableCells.length,
                            type: WidthType.PERCENTAGE,
                        },
                        shading: rowIndex === 0 ? { fill: "E0E0E0" } : undefined, // Header background
                    });
                }),
            });
        });

        children.push(new Table({
            rows: rows,
            width: {
                size: 100,
                type: WidthType.PERCENTAGE,
            },
            margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100,
            }
        }));

        children.push(new Paragraph({ text: "" })); // Spacing after table
        tableBuffer = [];
    };

    const parseLineToTextRuns = (text: string): TextRun[] => {
        // Simple bold parser: **text**
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return new TextRun({
                    text: part.slice(2, -2),
                    bold: true,
                });
            }
            return new TextRun({ text: part });
        });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Table handling
        if (line.startsWith('|')) {
            tableBuffer.push(line);
            continue;
        } else {
            processTableBuffer();
        }

        if (line === '') {
            children.push(new Paragraph({ text: "" }));
            continue;
        }

        if (line.startsWith('---')) {
            // Horizontal rule -> maybe just a spacing or a border?
            // docx doesn't exactly support hr in the same way, using a border bottom paragraph
            children.push(new Paragraph({
                border: {
                    bottom: {
                        color: "999999",
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 6,
                    },
                },
                spacing: { after: 200 }
            }));
            continue;
        }

        // Headings
        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                text: line.replace('# ', ''),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
            }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({
                text: line.replace('## ', ''),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 },
            }));
        } else if (line.startsWith('### ')) {
            children.push(new Paragraph({
                text: line.replace('### ', ''),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
            }));
        }
        // List items
        else if (line.startsWith('- ')) {
            children.push(new Paragraph({
                children: parseLineToTextRuns(line.replace('- ', '')),
                bullet: {
                    level: 0
                }
            }));
        }
        else if (line.match(/^\d+\.\s/)) { // Numbered list
            children.push(new Paragraph({
                children: parseLineToTextRuns(line.replace(/^\d+\.\s/, '')),
                numbering: {
                    reference: "default-numbering",
                    level: 0
                }
            }));
        }
        else {
            // Normal paragraph
            children.push(new Paragraph({
                children: parseLineToTextRuns(line),
                spacing: { after: 100 } // Line break
            }));
        }
    }

    // Flush remaining table
    processTableBuffer();

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
};
