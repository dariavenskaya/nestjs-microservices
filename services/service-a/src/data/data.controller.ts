import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import path from 'node:path';
import { EventsService } from '../events/events.service.ts';
import { RecordsService } from '../records/records.service.ts';
import { DataService } from './data.service.ts';
import { FetchDataDto } from './fetch-data.dto.ts';

@ApiTags('Data')
@Controller('data')
export class DataController {
  private readonly logger = new Logger(DataController.name);

  constructor(
    private readonly dataService: DataService,
    private readonly recordsService: RecordsService,
    private readonly eventsService: EventsService,
  ) {}

  @Post('fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch data from a public API and save it as JSON or Excel' })
  async fetchData(@Body() dto: FetchDataDto) {
    const started = Date.now();
    const result = await this.dataService.fetchAndSave(dto.url, dto.format, dto.filename);
    await this.publish('DATA_FETCHED', {
      url: dto.url,
      format: dto.format ?? 'json',
      filepath: result.filepath,
      recordCount: result.recordCount,
      duration: Date.now() - started,
    });
    return { message: 'Data fetched and saved successfully', ...result };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a JSON or Excel file, parse it, and insert the rows into MongoDB' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR ?? './uploads',
        filename: (_req, file, callback) => {
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${file.fieldname}-${suffix}${path.extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (!['.json', '.xlsx'].includes(extension)) {
          callback(new BadRequestException('Only .json and .xlsx files are supported'), false);
          return;
        }
        callback(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file?: { originalname: string; path: string; size: number }) {
    const started = Date.now();
    if (!file?.path || !file.size) {
      throw new BadRequestException('Attach a .json or .xlsx file in the file field.');
    }
    const extension = path.extname(file.originalname).toLowerCase();
    const records = extension === '.json' ? await this.dataService.readJson(file.path) : await this.dataService.readExcel(file.path);
    const insertedCount = await this.recordsService.insertRecords(records, path.basename(file.path));
    if (insertedCount === 0) {
      throw new BadRequestException('No records were inserted. The file needs at least one valid row.');
    }
    await this.publish('FILE_UPLOADED', {
      filename: file.originalname,
      filepath: file.path,
      recordCount: records.length,
      insertedCount,
      duration: Date.now() - started,
    });
    return {
      message: 'File uploaded and processed successfully',
      filename: file.originalname,
      recordCount: records.length,
      insertedCount,
    };
  }

  private async publish(action: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.eventsService.publishApiAction(action, data);
    } catch (error) {
      this.logger.error(`Failed to publish ${action}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
