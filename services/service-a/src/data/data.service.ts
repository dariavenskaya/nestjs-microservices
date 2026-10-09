import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { FileFormat } from './fetch-data.dto';

@Injectable()
export class DataService implements OnModuleInit {
  private readonly logger = new Logger(DataService.name);
  private readonly dataDir =
    process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
  readonly uploadsDir =
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

  async onModuleInit(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await mkdir(this.uploadsDir, { recursive: true });
  }

  async fetchAndSave(
    url: string,
    format: FileFormat = FileFormat.JSON,
    filename?: string,
  ) {
    const payload = await this.fetchJson(url);
    const records = (Array.isArray(payload) ? payload : [payload]).filter(
      isRecord,
    );
    if (records.length === 0) {
      throw new BadRequestException(
        `The API at "${url}" returned no valid record objects.`,
      );
    }

    const baseName = filename
      ? path.basename(filename).replace(/[^a-zA-Z0-9_-]/g, '_')
      : `data_${Date.now()}`;
    const filepath =
      format === FileFormat.EXCEL
        ? await this.saveExcel(records, baseName)
        : await this.saveJson(records, baseName);
    this.logger.log(`Saved ${records.length} records to ${filepath}`);
    return { filepath, recordCount: records.length };
  }

  async readJson(filepath: string): Promise<Array<Record<string, unknown>>> {
    let content: string;
    try {
      content = await readFile(filepath, 'utf8');
    } catch (error) {
      if (isEnoent(error)) {
        throw new NotFoundException(
          `File not found: ${path.basename(filepath)}`,
        );
      }
      throw new InternalServerErrorException('Failed to read file.');
    }
    if (!content.trim()) {
      throw new BadRequestException('The uploaded JSON file is empty.');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `The uploaded file contains invalid JSON: ${detail}`,
      );
    }
    const records = Array.isArray(parsed) ? parsed : [parsed];
    return records.filter((record): record is Record<string, unknown> =>
      isRecord(record),
    );
  }

  async readExcel(filepath: string): Promise<Array<Record<string, unknown>>> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filepath);
    } catch (error) {
      if (isEnoent(error)) {
        throw new NotFoundException(
          `File not found: ${path.basename(filepath)}`,
        );
      }
      const detail = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to read Excel file: ${detail}`);
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      throw new BadRequestException('The Excel file has no worksheet data.');
    }

    const headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
      headers[column - 1] = formatCellValue(cell.value) || `col_${column}`;
    });

    const records: Array<Record<string, unknown>> = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }
      const record: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: false }, (cell, column) => {
        const header = headers[column - 1];
        if (header) {
          record[header] = parseCellValue(cell.value);
        }
      });
      records.push(record);
    });
    if (records.length === 0) {
      throw new BadRequestException('The Excel file contains no data rows.');
    }
    return records;
  }

  private async fetchJson(url: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException(
          `Request to "${url}" timed out after 30 seconds.`,
        );
      }
      throw new BadGatewayException(`Failed to reach target URL: "${url}".`);
    }
    if (response.status === 404) {
      throw new NotFoundException(
        `The requested URL "${url}" was not found (404).`,
      );
    }
    if (!response.ok) {
      throw new BadRequestException(
        `The API at "${url}" returned ${response.status}.`,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new BadRequestException(
        `The API at "${url}" returned invalid JSON.`,
      );
    }
  }

  private async saveJson(
    records: unknown[],
    filename: string,
  ): Promise<string> {
    const filepath = path.join(this.dataDir, `${filename}.json`);
    try {
      await writeFile(filepath, JSON.stringify(records, null, 2));
    } catch (error) {
      this.logger.error(`Error saving file: ${error}`);
      throw new InternalServerErrorException('Failed to save the file.');
    }
    return filepath;
  }

  private async saveExcel(
    records: Array<Record<string, unknown>>,
    filename: string,
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');
    const headers = [
      ...new Set(records.flatMap((record) => Object.keys(record))),
    ];
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 20,
    }));
    for (const record of records) {
      const row: Record<string, string | number | boolean | null> = {};
      for (const header of headers) {
        const value = record[header];
        row[header] =
          typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : (value as string | number | boolean | null);
      }
      worksheet.addRow(row);
    }
    worksheet.getRow(1).font = { bold: true };
    const filepath = path.join(this.dataDir, `${filename}.xlsx`);
    try {
      await workbook.xlsx.writeFile(filepath);
    } catch (error) {
      this.logger.error(`Error saving Excel file: ${error}`);
      throw new InternalServerErrorException('Failed to save the Excel file.');
    }
    return filepath;
  }
}

function parseCellValue(value: ExcelJS.CellValue): unknown {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('result' in value) {
      return parseCellValue(value.result as ExcelJS.CellValue);
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }
  }
  return value;
}

function formatCellValue(value: ExcelJS.CellValue): string {
  const parsed = parseCellValue(value);
  return parsed == null ? '' : String(parsed);
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
