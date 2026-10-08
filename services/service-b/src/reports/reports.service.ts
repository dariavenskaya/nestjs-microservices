import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { EventLog, LogsService } from '../logs/logs.service';

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

  async buildPdf(
    startDate: string,
    endDate: string,
    type?: string,
  ): Promise<Buffer> {
    const logs = await this.logsService.series(startDate, endDate, type);
    const groups = groupByEvent(logs);
    const document = new PDFDocument({ margin: 50, size: 'A4' });

    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', (err) => reject(err));
    });

    document.fontSize(22).text('Time Series Report', { align: 'center' });
    document.moveDown(0.4);
    document
      .fontSize(12)
      .fillColor('#444444')
      .text(`Period:${startDate} to${endDate}`, { align: 'center' });
    document.fillColor('black').moveDown(1.5);

    if (groups.length === 0) {
      document.fontSize(14).text('No data available for the selected period.', {
        align: 'center',
      });
    } else {
      for (const [index, series] of groups.entries()) {
        if (index > 0 || document.y > 400) {
          document.addPage();
        }

        document.fontSize(18).text(series.event);
        document.moveDown(0.4);
        document
          .fontSize(11)
          .fillColor('#444444')
          .text('Request duration in milliseconds');
        document.fillColor('black').moveDown(0.6);

        writeStats(document, series.points);
        document.moveDown(1);
        drawLineChart(document, series);
      }

      document.addPage();
      document.fontSize(18).text('Summary');
      document.moveDown();
      for (const series of groups) {
        const values = series.points.map((p) => p.value);
        document
          .fontSize(12)
          .text(
            `${series.event}:${values.length} events, average${average(values).toFixed(1)} ms`,
          );
      }
    }

    document.end();
    return finished;
  }
}

function groupByEvent(logs: EventLog[]): Series[] {
  const grouped = new Map<string, Point[]>();
  for (const log of logs) {
    if (typeof log.data?.duration !== 'number') {
      continue;
    }
    const points = grouped.get(log.event) ?? [];
    points.push({ timestamp: log.timestamp, value: log.data.duration });
    grouped.set(log.event, points);
  }
  return [...grouped.entries()].map(([event, points]) => ({ event, points }));
}

function getMinMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  let min = values[0];
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  return { min, max };
}

function writeStats(document: PDFKit.PDFDocument, points: Point[]): void {
  const values = points.map((p) => p.value);
  const { min, max } = getMinMax(values);

  document.fontSize(12);
  document.text(`Count:${values.length}`);
  document.text(`Average:${average(values).toFixed(1)}`);
  document.text(`Min:${min}`);
  document.text(`Max:${max}`);
}

function drawLineChart(document: PDFKit.PDFDocument, series: Series): void {
  if (series.points.length === 0) return;

  const originX = 70;
  const height = 140;
  const width = 450;

  if (
    document.y + height + 50 >
    document.page.height - document.page.margins.bottom
  ) {
    document.addPage();
  }

  const originY = document.y + height;
  const values = series.points.map((p) => p.value);
  const { min, max } = getMinMax(values);
  const span = max - min || 1;

  document.rect(originX, originY - height, width, height).stroke('#cccccc');
  document.fontSize(9).fillColor('#666666');
  document.text(String(max), originX - 40, originY - height - 4, {
    width: 36,
    align: 'right',
  });
  document.text(String(min), originX - 40, originY - 8, {
    width: 36,
    align: 'right',
  });

  const step =
    series.points.length <= 1 ? 0 : width / (series.points.length - 1);
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

  const labelIndexes = [
    0,
    Math.floor((series.points.length - 1) / 2),
    series.points.length - 1,
  ];
  document.fillColor('#333333').fontSize(8);

  for (const index of [...new Set(labelIndexes)]) {
    const point = series.points[index];
    if (!point) continue;
    const x = originX + step * index;
    const label = new Date(point.timestamp).toLocaleDateString('ru-RU');
    document.text(label, x - 30, originY + 8, { width: 60, align: 'center' });
  }

  document.y = originY + 30;
  document.fillColor('black');
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
