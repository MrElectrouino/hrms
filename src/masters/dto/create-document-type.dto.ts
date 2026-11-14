import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

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
}
