import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class LeaveTypeDto {
  @IsString() @IsNotEmpty() @MaxLength(10) @Matches(/^[A-Za-z0-9_-]+$/) code: string;
  @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @IsBoolean() isPaid: boolean;
  @IsBoolean() balanceTracking: boolean;
  @IsIn(['NONE', 'ANNUAL', 'MONTHLY']) accrual: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(366) annualDays: number;
  @IsBoolean() allowHalfDay: boolean;
  @IsBoolean() allowNegative: boolean;
  @IsBoolean() requiresDocument: boolean;
  @Type(() => Number) @IsInt() @Min(0) documentAfterDays: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxDaysPerRequest?: number | null;
  @IsBoolean() isSandwichEligible: boolean;
  @IsBoolean() isCompOff: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class LeaveSettingsDto {
  @IsBoolean() sandwichEnabled: boolean;
  @IsBoolean() sandwichWeeklyOffs: boolean;
  @IsBoolean() sandwichHolidays: boolean;
  @IsBoolean() sandwichRequireBothSides: boolean;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) leaveYearStartMonth: number;
  @IsBoolean() compOffEnabled: boolean;
  @Type(() => Number) @IsNumber() @Min(0.25) @Max(5) compOffCreditDays: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) compOffExpiryDays?: number | null;
  @Type(() => Number) @IsInt() @Min(0) compOffMinWorkedMinutes: number;
}

export class LeaveRequestDto {
  @Type(() => Number) @IsInt() leaveTypeId: number;
  @IsString() @Matches(DATE) fromDate: string;
  @IsString() @Matches(DATE) toDate: string;
  @IsOptional() @IsIn(['FIRST', 'SECOND']) halfDayPart?: string;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class LeaveDecisionDto {
  @IsBoolean() approve: boolean;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class AccrualDto {
  /** Any date inside the period to credit; defaults to today. */
  @IsOptional() @IsString() @Matches(DATE) asOf?: string;
}

export class AdjustBalanceDto {
  @Type(() => Number) @IsInt() employeeId: number;
  @Type(() => Number) @IsInt() leaveTypeId: number;
  /** Positive adds days, negative takes days away. */
  @Type(() => Number) @IsNumber() days: number;
  @IsString() @IsNotEmpty() @MaxLength(200) note: string;
  @IsOptional() @IsString() @Matches(DATE) expiresOn?: string;
}
