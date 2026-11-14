import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ProfileRuleDto {
  @IsString()
  @MaxLength(50)
  sectionKey: string;

  /** Empty or omitted = the whole tab. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupTitle?: string;

  /** Empty or omitted = the whole group. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldKey?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean | null;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean | null;
}

export class SaveProfileRulesDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ProfileRuleDto)
  rules: ProfileRuleDto[];
}
