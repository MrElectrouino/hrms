import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

/** POST /countries — System Admin only. */
export class CreateCountryDto {
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'isoCode must be a 2-letter ISO country code, e.g. IN or AE' })
  isoCode!: string;

  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode must be a 3-letter ISO currency code, e.g. INR or AED' })
  currencyCode!: string;

  @IsString()
  @Length(2, 60)
  defaultTimezone!: string;

  @IsString()
  @Length(2, 10)
  defaultLanguage!: string;

  @IsString()
  @Length(2, 20)
  dateFormat!: string;
}

/** PATCH /countries/:id — isoCode is immutable once created. */
export class UpdateCountryDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currencyCode must be a 3-letter ISO currency code, e.g. INR or AED' })
  currencyCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  defaultTimezone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  defaultLanguage?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  dateFormat?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
