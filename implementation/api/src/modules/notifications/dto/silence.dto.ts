import { IsString, IsDateString } from 'class-validator';

export class SilenceDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsString()
  reason!: string;
}
