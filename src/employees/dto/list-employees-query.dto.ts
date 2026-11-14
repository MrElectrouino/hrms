import { IsOptional, IsInt, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListEmployeesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** Department name (parameter type "Department"), as stored in the Organization section. */
  @IsOptional()
  @IsString()
  department?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  siteId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  employeeTypeId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  isActive?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string = 'name';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
