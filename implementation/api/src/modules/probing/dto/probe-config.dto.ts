import { IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';

export class ProbeConfigDto {
  @IsNumber()
  @Min(10)
  interval_s!: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsNumber()
  expected_status?: number;

  @IsOptional()
  @IsString()
  body_match?: string;

  @IsOptional()
  @IsNumber()
  @Min(100)
  timeout_ms?: number;

  @IsOptional()
  @IsBoolean()
  follow_redirects?: boolean;

  @IsOptional()
  @IsBoolean()
  verify_tls?: boolean;
}
