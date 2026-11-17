import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const CODE_RE = /^[A-Za-z0-9_-]+$/;

export class WorkScheduleDto {
  @IsString() @IsNotEmpty() @MaxLength(20) @Matches(CODE_RE, { message: 'Code can use letters, numbers, - and _ only' })
  code: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsIn(['FIXED', 'FLEXIBLE'])
  scheduleType: string;

  @IsOptional() @IsString() startTime?: string | null;
  @IsOptional() @IsString() endTime?: string | null;
  @IsOptional() @IsString() earliestStartTime?: string | null;
  @IsOptional() @IsString() latestStartTime?: string | null;

  @Type(() => Number) @IsInt() @Min(1) @Max(1440)
  requiredDailyMinutes: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(480)
  breakMinutes?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1440)
  breakAfterMinutes?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class HolidayCalendarDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsIn(['COMPANY', 'COUNTRY', 'BRANCH', 'SITE'])
  scope: string;

  @IsOptional() @IsString() @MaxLength(2)
  countryCode?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  branchId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  siteId?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class HolidayDto {
  @IsString()
  date: string;

  /** Last day of the holiday (inclusive); leave out for a single day. */
  @IsOptional() @IsString()
  endDate?: string | null;

  @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;

  @IsOptional() @IsIn(['PUBLIC', 'COMPANY', 'OPTIONAL'])
  holidayType?: string;
}

export class HolidayOrderDto {
  @IsArray() @ArrayMaxSize(5) @IsString({ each: true })
  order: string[];
}

export class PatternDayDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(27)
  dayIndex: number;

  @IsOptional() @Type(() => Number) @IsInt()
  shiftId?: number | null;

  @IsOptional() @IsBoolean()
  isWeeklyOff?: boolean;
}

export class RosterPatternDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @Type(() => Number) @IsIn([7, 14, 21, 28])
  cycleDays: number;

  @IsArray() @ArrayMaxSize(28) @ValidateNested({ each: true }) @Type(() => PatternDayDto)
  days: PatternDayDto[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class AssignWorkScheduleDto {
  @Type(() => Number) @IsInt() workScheduleId: number;
  @IsString() effectiveFrom: string;
}

export class AssignPatternDto {
  @Type(() => Number) @IsInt() patternId: number;
  @IsString() effectiveFrom: string;
  /** Date where cycle day 1 falls; defaults to effectiveFrom. */
  @IsOptional() @IsString() anchorDate?: string;
}

export class AssignHolidayCalendarDto {
  @Type(() => Number) @IsInt() calendarId: number;
  @IsString() effectiveFrom: string;
}

export class RosterEntryDto {
  @Type(() => Number) @IsInt() employeeId: number;
  @IsString() date: string;
  @IsOptional() @Type(() => Number) @IsInt() shiftId?: number | null;
  @IsOptional() @IsBoolean() isWeeklyOff?: boolean;
}

export class AssignGroupDto {
  @IsIn(['WORK_SCHEDULE', 'WEEKLY_OFF', 'ROSTER_PATTERN']) kind: string;
  @IsIn(['COMPANY', 'COUNTRY', 'BRANCH', 'SITE']) scope: string;
  @IsOptional() @IsString() @MaxLength(10) countryCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() branchId?: number;
  @IsOptional() @Type(() => Number) @IsInt() siteId?: number;
  @Type(() => Number) @IsInt() refId: number;
  @IsString() effectiveFrom: string;
  /** Roster pattern only: date where cycle day 1 falls; defaults to effectiveFrom. */
  @IsOptional() @IsString() anchorDate?: string;
}
