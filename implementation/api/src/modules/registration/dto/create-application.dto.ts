import { IsString, IsUrl, IsEnum, IsOptional, IsArray, MinLength } from 'class-validator';

export enum NetworkType {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class CreateApplicationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUrl({ require_tld: false })
  baseUrl!: string;

  @IsOptional()
  @IsString()
  healthPath?: string;

  @IsEnum(NetworkType)
  networkType!: NetworkType;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
