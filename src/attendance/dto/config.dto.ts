import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PolicyDto {
  @IsOptional() @IsString() @MaxLength(30) @Matches(/^[A-Za-z0-9_-]+$/)
  code?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsBoolean() lateEnabled: boolean;
  @IsBoolean() halfDayEnabled: boolean;
  @IsBoolean() allowPastDateSelfMarking: boolean;
  @IsBoolean() applyLateRulesToPastDates: boolean;
  @IsOptional() @IsString() selfMarkCutoffTime?: string | null;
  @IsBoolean() cutoffExemptHr: boolean;
  @IsBoolean() managerEditsOnlyUnapproved: boolean;
  @IsBoolean() requiresApproval: boolean;
  @IsBoolean() useRamadanShiftStart: boolean;
  @IsBoolean() shortHoursEnabled: boolean;
  @Type(() => Number) @IsInt() shortHoursGraceMinutes: number;
  @IsBoolean() overtimeEnabled: boolean;
  @Type(() => Number) @IsInt() overtimeAfterMinutes: number;
}

export class AssignmentDto {
  @IsIn(['COUNTRY', 'BRANCH', 'EMPLOYEE'])
  scope: string;

  @IsOptional() @IsString() @MaxLength(2) countryCode?: string;
  @IsOptional() @Type(() => Number) @IsInt() branchId?: number;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number;
  @IsString() effectiveFrom: string;
  @IsOptional() @IsString() effectiveTo?: string;
}

export class RamadanDto {
  @IsString() @MaxLength(2) countryCode: string;
  @IsString() startDate: string;
  @IsString() endDate: string;
}

export class SettingsDto {
  @IsBoolean() moodEnabled: boolean;
  @IsIn(['OFF', 'OPTIONAL', 'REQUIRED']) gpsRequirement: string;
  @IsIn(['OFF', 'OPTIONAL', 'REQUIRED']) addressRequirement: string;
}

export class StatusDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) name?: string;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Colour must look like #16a34a' }) color?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
