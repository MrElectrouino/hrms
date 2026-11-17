import { IsString, IsOptional, IsBoolean, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  /** Country.isoCode values this type applies to (checked against the Countries list). Empty = every country. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  countryCodes?: string[];
}
