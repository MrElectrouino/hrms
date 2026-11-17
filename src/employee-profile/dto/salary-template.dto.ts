import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export class SalaryComponentInputDto {
  @IsString()
  @Length(2, 60)
  label!: string;

  /** Existing component code, sent back unchanged when editing so saved amounts stay linked. */
  @IsOptional()
  @Matches(/^[A-Z0-9_]{1,60}$/)
  code?: string;
}

/** POST /salary-templates — HR Admin or System Admin (D-024). */
export class CreateSalaryTemplateDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  countryCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentInputDto)
  components!: SalaryComponentInputDto[];
}

/** PATCH /salary-templates/:id */
export class UpdateSalaryTemplateDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentInputDto)
  components?: SalaryComponentInputDto[];
}
