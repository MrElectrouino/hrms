import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

const CODE_RE = /^[A-Za-z0-9_-]*$/;

export class CreateParameterDto {
  @Type(() => Number)
  @IsInt()
  parameterTypeId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  text: string;

  /** Short code. For Employee Type it is the prefix of generated employee codes. */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(CODE_RE, { message: 'Code can use letters, numbers, - and _ only' })
  code?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class UpdateParameterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(CODE_RE, { message: 'Code can use letters, numbers, - and _ only' })
  code?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
