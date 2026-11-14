import { Body, Controller, Get, Ip, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { LeaveService } from './leave.service';
import { LeaveConfigService } from './leave-config.service';
import { AccrualDto, AdjustBalanceDto, LeaveDecisionDto, LeaveRequestDto, LeaveSettingsDto, LeaveTypeDto } from './dto/leave.dto';

const ok = (data: unknown, text: string) => ({ data, message: { code: 'OK', text } });

/** Applying for leave and deciding it. Who may do what is decided in the service. */
@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave')
export class LeaveController {
  constructor(
    private readonly service: LeaveService,
    private readonly config: LeaveConfigService,
  ) {}

  @Get('types')
  async types() {
    return ok(await this.config.types(true), 'Leave types retrieved');
  }

  @Get('balances')
  async balances(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.myBalances(u), 'Balances retrieved');
  }

  @Post('preview')
  async preview(@Body() dto: LeaveRequestDto, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.preview(u, dto), 'Preview calculated');
  }

  @Post('applications')
  async apply(@Body() dto: LeaveRequestDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.apply(u, dto, ip), 'Leave applied');
  }

  @Get('applications/me')
  async mine(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.mine(u), 'Applications retrieved');
  }

  @Get('applications/team')
  async team(@Query('status') status: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.team(u, status), 'Applications retrieved');
  }

  @Put('applications/:id/decision')
  async decide(@Param('id', ParseIntPipe) id: number, @Body() dto: LeaveDecisionDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.decide(u, id, dto.approve, dto.note, ip);
    return ok(null, dto.approve ? 'Leave approved' : 'Leave rejected');
  }

  @Put('applications/:id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.cancel(u, id, ip);
    return ok(null, 'Leave cancelled');
  }

  @Get('calendar')
  async calendar(@Query('from') from: string, @Query('to') to: string, @Query('scope') scope: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.calendar(u, from, to, scope === 'team' ? 'team' : 'me'), 'Calendar retrieved');
  }

  @Get('ledger')
  async ledger(@Query('employeeId') employeeId: string | undefined, @Query('leaveTypeId') typeId: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.ledgerFor(u, employeeId ? Number(employeeId) : undefined, typeId ? Number(typeId) : undefined), 'Ledger retrieved');
  }

  @Get('balances/:employeeId')
  async balancesOf(@Param('employeeId', ParseIntPipe) employeeId: number, @CurrentUser() u: CurrentUserPayload) {
    await this.service.ledgerFor(u, employeeId); // same access check as the ledger
    return ok(await this.service.balances(employeeId), 'Balances retrieved');
  }

  @Post('adjust')
  async adjust(@Body() dto: AdjustBalanceDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.adjust(u, dto, ip), 'Balance adjusted');
  }

  @Post('accrual')
  @UseGuards(RolesGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async accrual(@Body() dto: AccrualDto, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.runAccrual(u, dto.asOf), 'Accrual run');
  }

  @Post('comp-off/sync')
  @UseGuards(RolesGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async compOff() {
    return ok({ granted: await this.service.syncCompOff() }, 'Comp off checked');
  }
}

/** System Settings > Leave configuration. System Admin only. */
@ApiTags('Leave configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin)
@Controller('leave-config')
export class LeaveConfigController {
  constructor(private readonly config: LeaveConfigService) {}

  @Get()
  async overview() {
    return ok({ types: await this.config.types(false), settings: await this.config.settings() }, 'Leave configuration retrieved');
  }
  @Post('types')
  async create(@Body() dto: LeaveTypeDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.config.create(dto, u, ip), 'Leave type created');
  }
  @Put('types/:id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: LeaveTypeDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.config.update(id, dto, u, ip), 'Leave type saved');
  }
  @Put('settings')
  async settings(@Body() dto: LeaveSettingsDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.config.saveSettings(dto, u, ip), 'Leave settings saved');
  }
}
