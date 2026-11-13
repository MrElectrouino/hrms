import { IsHexColor, IsOptional, IsString, Length, MaxLength } from 'class-validator';

/** PATCH /branding — System Admin only. Logo/favicon are uploaded separately (multipart). */
export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  appName?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  loginBrandingText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  footerText?: string;
}
