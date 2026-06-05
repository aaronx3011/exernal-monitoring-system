import { IsString, IsOptional, IsNumber, Min, Max, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StageDto {
  @IsNumber()
  @Min(0)
  target!: number;

  @IsNumber()
  @Min(1)
  duration_s!: number;
}

export class CreateTestDto {
  @IsString()
  applicationId!: string;

  @IsString()
  name!: string;

  @IsString()
  targetPath!: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  vus?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  duration_s?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageDto)
  stages?: StageDto[];

  @IsOptional()
  @IsObject()
  thresholds?: Record<string, string>;

  @IsOptional()
  @IsString()
  schedule_cron?: string;

  @IsOptional()
  @IsNumber()
  @Max(500)
  max_vus_cap?: number;
}
