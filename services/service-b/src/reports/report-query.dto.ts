import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { DATE_ONLY, DATE_ONLY_MESSAGE } from '../dates';
import { EventType } from '../types';

export class ReportQueryDto {
  @ApiProperty({ example: '2026-01-01', description: 'Date only, YYYY-MM-DD' })
  @Matches(DATE_ONLY, { message: DATE_ONLY_MESSAGE })
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'Date only, YYYY-MM-DD' })
  @Matches(DATE_ONLY, { message: DATE_ONLY_MESSAGE })
  endDate: string;

  @ApiProperty({ required: false, example: 'DATA_FETCHED', enum: EventType })
  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;
}
