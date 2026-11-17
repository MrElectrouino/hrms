import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { toIsoDate } from './attendance-logic';

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;

/** Plain text of an Excel cell (dates become YYYY-MM-DD; rich text, formulas and hyperlinks are flattened). */
export function cellText(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return toIsoDate(v);
  if (typeof v === 'object') {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join('').trim() || null;
    if ('result' in o) return cellText(o.result as ExcelJS.CellValue);
    if (typeof o.text === 'string') return o.text.trim() || null;
    return null;
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

export interface SheetRow {
  /** Row number as shown in Excel (header is row 1). */
  row: number;
  cells: (string | null)[];
}

/** Reads the first sheet of an .xlsx file. Row 1 must be the header; returns the rows below it. */
export async function readSheet(buffer: Buffer, expectedHeaders: string[], optionalHeaders: string[] = []): Promise<SheetRow[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException('This is not a valid .xlsx file');
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new BadRequestException('The file has no sheet');

  const header = expectedHeaders.map((_, i) => (cellText(ws.getRow(1).getCell(i + 1).value) ?? '').toLowerCase());
  const want = expectedHeaders.map((h) => h.toLowerCase());
  if (header.join('|') !== want.join('|')) {
    throw new BadRequestException(`Row 1 must be the header: ${expectedHeaders.join(', ')}. Download the template to start.`);
  }
  // Optional trailing columns may be missing, but if present the header must match.
  optionalHeaders.forEach((h, k) => {
    const got = (cellText(ws.getRow(1).getCell(expectedHeaders.length + k + 1).value) ?? '').toLowerCase();
    if (got && got !== h.toLowerCase()) throw new BadRequestException(`Column ${expectedHeaders.length + k + 1} must be "${h}" (or left out). Download the template to start.`);
  });
  const allHeaders = [...expectedHeaders, ...optionalHeaders];
  if (ws.rowCount - 1 > IMPORT_MAX_ROWS) throw new BadRequestException(`At most ${IMPORT_MAX_ROWS} rows per file`);

  const rows: SheetRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const cells = allHeaders.map((_, i) => cellText(ws.getRow(r).getCell(i + 1).value));
    if (cells.every((c) => c === null)) continue; // blank line
    rows.push({ row: r, cells });
  }
  return rows;
}

/** Builds a template workbook: bold header, one sample row, readable column widths. */
export async function buildTemplate(sheetName: string, headers: string[], sample: string[] | string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers).font = { bold: true };
  for (const row of Array.isArray(sample[0]) ? (sample as string[][]) : [sample as string[]]) ws.addRow(row);
  ws.columns = headers.map(() => ({ width: 24 }));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
