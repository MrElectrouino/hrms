import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

const VALUE_KINDS = ['string', 'number', 'date', 'secret'] as const;

/** POST /system-configurations — System Admin only. */
export class CreateSystemConfigurationDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  value?: string;

  @IsOptional()
  @IsIn(VALUE_KINDS as unknown as string[])
  valueKind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

/** PATCH /system-configurations/:id — name and valueKind are immutable once created. */
export class UpdateSystemConfigurationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  value?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

/** POST /system-configurations/email/test — System Admin only. */
export class TestEmailDto {
  @IsEmail()
  @MaxLength(120)
  to!: string;
}
