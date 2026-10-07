import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EventLog, LogsService } from '../logs/logs.service.ts';

interface Point {
  timestamp: number;
  value: number;
}

interface Series {
  event: string;
  points: Point[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly logsService: LogsService) {}

  async buildPdf(startDate: string, endDate: string, type?: string): Promise<Buffer> {
    const logs = await this.logsService.series(startDate, endDate, type);
    const groups = groupByEvent(logs);
    const document = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
    });

    document.fontSize(22).text('Time Series Report', { align: 'center' });
    document.moveDown(0.4);
    document.fontSize(12).fillColor('#444444').text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    document.fillColor('black');

    if (groups.length === 0) {
      document.moveDown(2).fontSize(14).text('No data available for the selected period.', { align: 'center' });
    }

    for (const series of groups) {
      document.addPage();
      document.fontSize(18).text(series.event);
      document.moveDown(0.4);
      document.fontSize(11).fillColor('#444444').text('Request duration in milliseconds');
      document.fillColor('black').moveDown(0.6);
      writeStats(document, series.points);
      document.moveDown(1);
      drawLineChart(document, series);
    }

    document.addPage();
    document.fontSize(18).text('Summary');
    document.moveDown();
    for (const series of groups) {
      const values = series.points.map((point) => point.value);
      document.fontSize(12).text(`${series.event}: ${values.length} events, average ${average(values).toFixed(1)} ms`);
    }
    if (groups.length === 0) {
      document.fontSize(12).text('No events were recorded in this period.');
    }

    document.end();
    return finished;
  }
}

function groupByEvent(logs: EventLog[]): Series[] {
  const grouped = new Map<string, Point[]>();
  for (const log of logs) {
    const points = grouped.get(log.event) ?? [];
    const duration = typeof log.data?.duration === 'number' ? log.data.duration : 1;
    points.push({ timestamp: log.timestamp, value: duration });
    grouped.set(log.event, points);
  }
  return [...grouped.entries()].map(([event, points]) => ({ event, points }));
}

function writeStats(document: PDFKit.PDFDocument, points: Point[]): void {
  const values = points.map((point) => point.value);
  document.fontSize(12);
  document.text(`Count: ${values.length}`);
  document.text(`Average: ${average(values).toFixed(1)}`);
  document.text(`Min: ${Math.min(...values)}`);
  document.text(`Max: ${Math.max(...values)}`);
}

function drawLineChart(document: PDFKit.PDFDocument, series: Series): void {
  const originX = 70;
  const originY = document.y + 180;
  const width = 450;
  const height = 160;
  const values = series.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  document.rect(originX, originY - height, width, height).stroke('#cccccc');
  document.fontSize(9).fillColor('#666666');
  document.text(String(max), originX - 40, originY - height - 4, { width: 36, align: 'right' });
  document.text(String(min), originX - 40, originY - 8, { width: 36, align: 'right' });
  document.text('Value', originX - 48, originY - height / 2, { width: 40 });
  document.text('Date', originX + width / 2 - 20, originY + 28);

  const step = series.points.length === 1 ? 0 : width / (series.points.length - 1);
  document.strokeColor('#1f4e79').lineWidth(1.5);
  series.points.forEach((point, index) => {
    const x = originX + step * index;
    const y = originY - ((point.value - min) / span) * height;
    if (index === 0) {
      document.moveTo(x, y);
    } else {
      document.lineTo(x, y);
    }
  });
  document.stroke();

  const labelIndexes = [0, Math.floor((series.points.length - 1) / 2), series.points.length - 1];
  document.fillColor('#333333').fontSize(8);
  for (const index of [...new Set(labelIndexes)]) {
    const point = series.points[index];
    if (!point) {
      continue;
    }
    const x = originX + step * index;
    const label = new Date(point.timestamp).toLocaleDateString();
    document.text(label, x - 30, originY + 8, { width: 60, align: 'center' });
  }
  document.fillColor('black').moveDown(12);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
