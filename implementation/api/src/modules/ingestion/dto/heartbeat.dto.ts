import { IsEnum, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';

export enum HeartbeatStatus {
  UP = 'up',
  DEGRADED = 'degraded',
  DOWN = 'down',
}

export class HeartbeatDto {
  @IsEnum(HeartbeatStatus)
  status!: HeartbeatStatus;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsNumber()
  uptime_s?: number;

  @IsOptional()
  @IsObject()
  custom?: Record<string, any>;
}
