import { IsOptional, IsString } from 'class-validator';

export class CreateKeyDto {
  @IsOptional()
  @IsString()
  label?: string;
}
