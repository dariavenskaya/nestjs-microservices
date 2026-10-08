import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DATE_ONLY, DATE_ONLY_MESSAGE } from '../dates';
import { EventType } from '../types';

export class LogQueryDto {
  @ApiProperty({ required: false, example: 'DATA_FETCHED', enum: EventType })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiProperty({
    required: false,
    example: '2026-01-01',
    description: 'Date only, YYYY-MM-DD',
  })
  @Matches(DATE_ONLY, { message: DATE_ONLY_MESSAGE })
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    required: false,
    example: '2026-12-31',
    description: 'Date only, YYYY-MM-DD',
  })
  @Matches(DATE_ONLY, { message: DATE_ONLY_MESSAGE })
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
