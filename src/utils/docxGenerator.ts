import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

/**
 * Parses markdown-like styling within a text string.
 * Supports:
 * - **bold**
 * - _italic_
 * - <br> or <br/> for line breaks
 */
const parseTextToRuns = (text: string, defaultProps: any = {}): TextRun[] => {
    // 1. Split by <br>, <br/>, or <br />
    const lines = text.split(/<br\s*\/?>/gi);
    const runs: TextRun[] = [];

    lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            // Add a line break before subsequent lines
            runs.push(new TextRun({ text: "", break: 1 }));
        }

        // 2. Parse bold (**text**)
        const boldParts = line.split(/(\*\*[^*]+\*\*)/g);

        boldParts.forEach(boldPart => {
            if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                // This part is bold. Now parse italic inside it or just add it.
                // Assuming simple nesting: **_italic_** or **text**
                const content = boldPart.slice(2, -2);
                runs.push(...parseItalic(content, { ...defaultProps, bold: true }));
            } else {
                // Not bold (or mixed). Parse italic.
                runs.push(...parseItalic(boldPart, defaultProps));
            }
        });
    });

    return runs;
};

const parseItalic = (text: string, props: any): TextRun[] => {
    // 3. Parse italic (_text_ or *text*)
    // Note: markdown uses _ or * for italic. We'll stick to _ for now based on user data.
    // Also handle possible single * if needed, but user data showed _text_.
    const parts = text.split(/(_[^_]+_)/g);
    return parts.map(part => {
        if (part.startsWith('_') && part.endsWith('_')) {
            return new TextRun({
                text: part.slice(1, -1),
                ...props,
                italics: true
            });
        }
        return new TextRun({
            text: part,
            ...props
        });
    });
};


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
            // Split by | but handle escaped pipes if needed (not implemented here for simplicity)
            // Using a simpler split that filters empty start/end
            const rawCells = line.split('|');
            const tableCells = rawCells.slice(1, -1).map(c => c.trim());

            return new TableRow({
                children: tableCells.map(cellText => {
                    // Parse cell content for bold, italic, br
                    const isHeader = rowIndex === 0;

                    // Header default styling
                    const cellParagraphs: Paragraph[] = [];

                    // If text contains <br>, we might want separate paragraphs or just line breaks in one paragraph.
                    // docx Paragraph supports children TextRuns which can have breaks.
                    // Let's use one Paragraph per cell for now, unless complex.

                    const runs = parseTextToRuns(cellText, {
                        bold: isHeader,
                        size: 20, // 10pt
                    });

                    cellParagraphs.push(new Paragraph({
                        children: runs,
                        alignment: AlignmentType.CENTER, // Default centering for table cells
                        spacing: { before: 60, after: 60 } // Padding-like spacing
                    }));

                    return new TableCell({
                        children: cellParagraphs,
                        width: {
                            size: 100 / tableCells.length,
                            type: WidthType.PERCENTAGE,
                        },
                        shading: isHeader ? { fill: "E0E0E0" } : undefined, // Header background
                        verticalAlign: AlignmentType.CENTER,
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
        } else if (line.startsWith('#### ')) {
            children.push(new Paragraph({
                text: line.replace('#### ', ''),
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 150, after: 100 },
            }));
        }
        // List items
        else if (line.startsWith('- ')) {
            children.push(new Paragraph({
                children: parseTextToRuns(line.replace('- ', '')),
                bullet: {
                    level: 0
                }
            }));
        }
        else if (line.match(/^\d+\.\s/)) { // Numbered list
            children.push(new Paragraph({
                children: parseTextToRuns(line.replace(/^\d+\.\s/, '')),
                numbering: {
                    reference: "default-numbering",
                    level: 0
                }
            }));
        }
        else if (line.startsWith('> ')) { // Blockquote
            children.push(new Paragraph({
                children: parseTextToRuns(line.replace('> ', ''), { italics: true, color: "555555" }),
                indent: { left: 720 }, // 0.5 inch
                spacing: { before: 100, after: 100 },
                border: {
                    left: {
                        color: "CCCCCC",
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 24, // 3pt
                    }
                }
            }));
        }
        else {
            // Normal paragraph with parsing
            children.push(new Paragraph({
                children: parseTextToRuns(line),
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
