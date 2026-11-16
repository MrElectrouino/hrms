import { Body, Controller, Get, Ip, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { BulkUpdateService } from './bulk-update.service';
import { MAX_BULK_EMPLOYEES } from './bulk-fields';

const ok = (data: unknown, text: string) => ({ data, message: { code: 'OK', text } });

class ChangeDto {
  @IsString() @MaxLength(60) field: string;
  @IsOptional() @IsString() @MaxLength(200) value?: string | null;
}

class ApplyDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_BULK_EMPLOYEES) @Type(() => Number) @IsInt({ each: true }) employeeIds: number[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ChangeDto) changes: ChangeDto[];
}

@ApiTags('Bulk update')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin, UserType.HRAdmin)
@Controller('bulk-update')
export class BulkUpdateController {
  constructor(private readonly service: BulkUpdateService) {}

  /** The fields that can be changed in bulk, with their options. */
  @Get('fields')
  async fields(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.fields(u), 'Fields retrieved');
  }

  /** Employees to choose from: all active ones, or those in the given branches (?branchIds=1,2). */
  @Get('employees')
  async employees(@Query('branchIds') branchIds: string | undefined, @Query('search') search: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    const ids = (branchIds ?? '').split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n) && n > 0);
    return ok(await this.service.employees(u, ids, search), 'Employees retrieved');
  }

  @Post('apply')
  async apply(@Body() dto: ApplyDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    const result = await this.service.apply(u, dto.employeeIds, dto.changes.map((c) => ({ field: c.field, value: c.value ?? null })), ip);
    return ok(result, `${result.updated} employee${result.updated === 1 ? '' : 's'} updated`);
  }
}
