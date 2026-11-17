import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Documents of this type must carry issue and expiry dates. */
  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  /** Country.isoCode values this type applies to (checked against the Countries list). Empty/omitted = every country. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  countryCodes?: string[];
}
