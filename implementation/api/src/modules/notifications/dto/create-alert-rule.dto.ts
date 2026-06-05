import { IsString, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';

export enum AlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

export class CreateAlertRuleDto {
  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsString()
  conditionType!: string;

  @IsObject()
  parameters!: Record<string, any>;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
