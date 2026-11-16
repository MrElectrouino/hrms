import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class WeeklyOffRuleDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(6) day: number;
  @IsIn(['WEEKS', 'ALTERNATE']) kind: 'WEEKS' | 'ALTERNATE';
  /** WEEKS: which occurrences of the weekday in the month (1 to 5, -1 = last). */
  @IsOptional() @IsArray() @ArrayMaxSize(6) @Type(() => Number) @IsInt({ each: true }) weeks?: number[];
  /** ALTERNATE: the first day off (a date on that weekday); then every second week. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) anchor?: string;
}

export class WeeklyOffTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name: string;

  /** 0 = Sunday ... 6 = Saturday. */
  @IsArray() @ArrayMaxSize(7) @Type(() => Number) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) days: number[];

  /** Weekdays that are off only some weeks (for example the 2nd and 4th Saturday). */
  @IsOptional() @IsArray() @ArrayMaxSize(7) @ValidateNested({ each: true }) @Type(() => WeeklyOffRuleDto) rules?: WeeklyOffRuleDto[];

  @IsOptional() @IsString() @MaxLength(200) note?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AssignWeeklyOffDto {
  /** null removes the employee's weekly off template. */
  @IsOptional() @Type(() => Number) @IsInt() templateId?: number | null;
  /** Defaults to today. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom?: string;
}
