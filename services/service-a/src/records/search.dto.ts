import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchDto {
  @ApiProperty({ required: false, example: 'Leanne', description: 'Text search across indexed fields' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({
    required: false,
    description: 'Cursor returned as nextCursor from the previous page. Omit it to read the first page.',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiProperty({ required: false, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
