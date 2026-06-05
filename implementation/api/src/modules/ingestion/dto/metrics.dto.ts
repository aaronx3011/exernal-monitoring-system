import { IsString, IsNumber, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MetricSampleDto {
  @IsString()
  name!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsObject()
  labels?: Record<string, string>;

  @IsString()
  ts!: string;
}

export class MetricsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricSampleDto)
  metrics!: MetricSampleDto[];
}
