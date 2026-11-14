import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class BranchDto {
  @IsString() @IsNotEmpty() @MaxLength(20) @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Code can use letters, numbers, - and _ only' }) code: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  /** Must be an active country in the country list. */
  @IsOptional() @IsString() @MaxLength(10) countryCode?: string | null;
  /** IANA name such as Asia/Dubai. Empty = use the country's timezone. */
  @IsOptional() @IsString() @MaxLength(60) timezone?: string | null;
  @IsOptional() @IsString() @MaxLength(300) address?: string | null;
  @IsOptional() @IsString() @MaxLength(80) city?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(120) email?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}
