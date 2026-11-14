import { Body, Controller, Delete, Get, Ip, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { LeavePolicyDto } from './dto/leave-policy.dto';
import { LeavePolicyService } from './leave-policy.service';

const ok = (data: unknown, text: string) => ({ data, message: { code: 'OK', text } });

/** Leave policies: HR and System Admin. */
@ApiTags('Leave policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin, UserType.HRAdmin)
@Controller('leave-policies')
export class LeavePolicyController {
  constructor(private readonly service: LeavePolicyService) {}

  @Get()
  async list() {
    return ok(await this.service.list(), 'Policies retrieved');
  }

  /** Works out the entitlement for one employee and leave type without saving anything. */
  @Get('preview')
  async preview(@Query('employeeId', ParseIntPipe) employeeId: number, @Query('leaveTypeId', ParseIntPipe) leaveTypeId: number, @Query('yearStart') yearStart: string) {
    return ok(await this.service.preview(employeeId, leaveTypeId, yearStart), 'Entitlement worked out');
  }

  @Post()
  async create(@Body() dto: LeavePolicyDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.create(dto, u, ip), 'Policy created');
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: LeavePolicyDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.update(id, dto, u, ip), 'Policy saved');
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.remove(id, u, ip);
    return ok(null, 'Policy deleted');
  }
}
