import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_OPTIONS_REQUIRED, COUNTRIES, SECTION_KEYS } from '../profile-schema';

/** POST /custom-fields — System Admin only (D-023). The code is generated from the label. */
export class CreateCustomFieldDto {
  @IsString()
  @Length(2, 80)
  label!: string;

  @IsIn(SECTION_KEYS as unknown as string[])
  tabKey!: string;

  @IsString()
  @Length(2, 80)
  sectionName!: string;

  @IsIn(CUSTOM_FIELD_TYPES as unknown as string[])
  fieldType!: string;

  @ValidateIf((o) => CUSTOM_FIELD_OPTIONS_REQUIRED.includes(o.fieldType))
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsIn(['ALL', ...COUNTRIES])
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  placeholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  helpText?: string;
}

/** PATCH /custom-fields/:code — the code is immutable; labels and status can change. */
export class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  placeholder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  helpText?: string;
}
