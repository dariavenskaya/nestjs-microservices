import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export enum FileFormat {
  JSON = 'json',
  EXCEL = 'excel',
}

export class FetchDataDto {
  @ApiProperty({
    example: 'https://jsonplaceholder.typicode.com/users',
    description: 'Public HTTP or HTTPS API that returns JSON',
  })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url: string;

  @ApiProperty({ enum: FileFormat, default: FileFormat.JSON, required: false })
  @IsEnum(FileFormat)
  @IsOptional()
  format?: FileFormat = FileFormat.JSON;

  @ApiProperty({ example: 'users', required: false })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  filename?: string;
}
