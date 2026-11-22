import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SlabDto {
  @Type(() => Number) @IsInt() @Min(0) fromMonths: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) toMonths?: number | null;
  @Type(() => Number) @IsNumber() @Min(0) @Max(366) annualDays: number;
}

export class PolicyRuleDto {
  @Type(() => Number) @IsInt() leaveTypeId: number;
  @Type(() => Number) @IsNumber() @Min(0) @Max(366) annualDays: number;
  @IsIn(['UPFRONT', 'MONTHLY', 'MONTHLY_LUMP', 'NONE']) creditMethod: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SlabDto) slabs?: SlabDto[];
  @IsIn(['NEXT_YEAR', 'IMMEDIATE']) slabTiming: string;
  @IsOptional() @IsIn(['JOINING_DATE', 'REJOINING_DATE']) serviceBasis?: string;
  @IsIn(['NONE', 'COMPLETED_MONTHS', 'STARTED_MONTHS', 'CUTOFF_DAY', 'EXACT_DAYS']) proration: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(31) cutoffDay?: number | null;
  @IsIn(['NONE', 'DOWN', 'UP', 'NEAREST', 'NEAREST_HALF', 'UP_HALF', 'DOWN_HALF']) rounding: string;
  @IsIn(['UP', 'DOWN']) tieRule: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minDays?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxDays?: number | null;
  @IsOptional() @IsString() @MaxLength(200) formula?: string | null;
}

export class LeavePolicyDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsIn(['STATUTORY', 'COMPANY']) layer: string;
  @IsOptional() @IsString() @MaxLength(10) countryCode?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() branchId?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() employeeTypeId?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number | null;
  @Matches(DATE) effectiveFrom: string;
  @IsOptional() @Matches(DATE) effectiveTo?: string | null;
  @Type(() => Number) @IsInt() @Min(0) @Max(100) priority: number;
  @IsOptional() @IsString() @MaxLength(300) note?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PolicyRuleDto) rules: PolicyRuleDto[];
}
