import { IsInt, IsOptional, IsBoolean, IsArray, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  userTypeId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** true = every branch; false = only branchIds. System Admin only. */
  @IsOptional()
  @IsBoolean()
  allBranches?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Type(() => Number)
  branchIds?: number[];
}
