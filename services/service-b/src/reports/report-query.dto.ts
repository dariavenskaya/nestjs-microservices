import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EventType } from '../types.ts';

export class ReportQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false, example: 'DATA_FETCHED', enum: EventType })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;
}
