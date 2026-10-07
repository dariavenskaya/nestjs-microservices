import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  Max,
  Min,
} from 'class-validator';
import { EventType } from '../types.ts';

export class LogQueryDto {
  @ApiProperty({ required: false, example: 'DATA_FETCHED', enum: EventType })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @ApiProperty({ required: false, example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
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
