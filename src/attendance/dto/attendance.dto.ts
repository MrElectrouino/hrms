import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** GPS as "lat,lng". The browser or app sends it; the server records the IP itself. */
const COORDS = /^-?\d{1,3}(\.\d+)?,\s?-?\d{1,3}(\.\d+)?$/;

export class MarkAttendanceDto {
  /** A past date (YYYY-MM-DD), only when the policy allows past-day marking. Omit for today. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must look like 2026-12-01' })
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(COORDS, { message: 'Coordinates must look like 25.2048,55.2708' })
  coordinates?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mood?: string;
}

export class EditAttendanceDto {
  /** Local times (HH:mm) in the employee's timezone. Easier and safer than sending instants. */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'IN time must be HH:mm' })
  inTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'OUT time must be HH:mm' })
  outTime?: string;

  @IsOptional()
  @IsISO8601()
  inAt?: string;

  @IsOptional()
  @IsISO8601()
  outAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  statusCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  remarks?: string;

  /** The manager ticks this while approving a day worked on a holiday or weekly off; comp off is credited immediately. */
  @IsOptional()
  @IsBoolean()
  compOffEligible?: boolean;
}

export class RegularizationDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'IN time must be HH:mm' }) inTime?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'OUT time must be HH:mm' }) outTime?: string;
  @IsString() @IsNotEmpty() @MaxLength(300) reason: string;
}

export class DecisionDto {
  @IsBoolean() approve: boolean;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class ProcessDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) from: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) to: string;
}
