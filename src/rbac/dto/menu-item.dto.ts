import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @IsString()
  @Length(1, 100)
  name: string;

  /** Absolute app path such as /employees. Omit or null for a group header. */
  @IsOptional()
  @IsString()
  @Matches(/^\/[^\s]*$/, { message: 'pageUrl must be an absolute path starting with /' })
  @Length(1, 350)
  pageUrl?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  iconClass?: string | null;

  @IsInt()
  @Min(0)
  displayOrder: number;

  /** Omit or null for a top-level item. */
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsBoolean()
  isMainMenu?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
