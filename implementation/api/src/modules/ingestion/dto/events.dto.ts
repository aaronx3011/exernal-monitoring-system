import { IsEnum, IsString, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum EventLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export class EventDto {
  @IsEnum(EventLevel)
  level!: EventLevel;

  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsString()
  ts!: string;
}

export class EventsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events!: EventDto[];
}
