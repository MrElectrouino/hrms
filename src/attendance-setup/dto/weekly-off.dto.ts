import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class WeeklyOffTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name: string;

  /** 0 = Sunday ... 6 = Saturday. */
  @IsArray() @ArrayMaxSize(7) @Type(() => Number) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) days: number[];

  @IsOptional() @IsString() @MaxLength(200) note?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AssignWeeklyOffDto {
  /** null removes the employee's weekly off template. */
  @IsOptional() @Type(() => Number) @IsInt() templateId?: number | null;
  /** Defaults to today. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom?: string;
}
