import { Body, Controller, Delete, Get, Ip, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { AttendanceService } from './attendance.service';
import { AttendanceConfigService } from './attendance-config.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { RegularizationService } from './regularization.service';
import { AttendanceReportsService, ExceptionKind } from './attendance-reports.service';
import { DecisionDto, EditAttendanceDto, MarkAttendanceDto, ProcessDto, RegularizationDto } from './dto/attendance.dto';
import { AssignmentDto, BranchTimezoneDto, PolicyDto, RamadanDto, SettingsDto, StatusDto } from './dto/config.dto';

const ok = (data: unknown, text: string) => ({ data, message: { code: 'OK', text } });

/** Marking and reading attendance. Who may do what is decided in the service. */
@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly service: AttendanceService,
    private readonly processing: AttendanceProcessingService,
    private readonly regularization: RegularizationService,
    private readonly reports: AttendanceReportsService,
  ) {}

  /** HR / System Admin: build the days nobody marked and the hours for a finished date range. */
  @Post('process')
  async process(@Body() dto: ProcessDto, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.processing.run(u, dto.from, dto.to, 'MANUAL'), 'Attendance processed');
  }

  @Get('process/runs')
  async runs() {
    return ok(await this.processing.runs(), 'Runs retrieved');
  }

  @Post('regularizations')
  async requestFix(@Body() dto: RegularizationDto, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.regularization.request(u, dto), 'Request sent');
  }

  @Get('regularizations/me')
  async myFixes(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.regularization.mine(u), 'Requests retrieved');
  }

  @Get('regularizations/team')
  async teamFixes(@Query('status') status: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.regularization.team(u, status), 'Requests retrieved');
  }

  @Put('regularizations/:id/cancel')
  async cancelFix(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload) {
    await this.regularization.cancel(u, id);
    return ok(null, 'Request cancelled');
  }

  @Put('regularizations/:id/decision')
  async decideFix(@Param('id', ParseIntPipe) id: number, @Body() dto: DecisionDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.regularization.decide(u, id, dto.approve, dto.note, ip);
    return ok(null, dto.approve ? 'Request approved' : 'Request rejected');
  }

  @Get('reports/summary')
  async summary(@Query('from') from: string, @Query('to') to: string, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.reports.summary(u, from, to), 'Report retrieved');
  }

  @Get('reports/exceptions')
  async exceptions(@Query('kind') kind: ExceptionKind, @Query('from') from: string, @Query('to') to: string, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.reports.exceptions(u, kind, from, to), 'Report retrieved');
  }

  @Get('today')
  async today(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.today(u), 'Today retrieved');
  }

  @Post('mark')
  async mark(@Body() dto: MarkAttendanceDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.mark(u, dto, ip), 'Attendance marked');
  }

  @Get('statuses')
  async statuses() {
    return ok(await this.service.statuses(), 'Statuses retrieved');
  }

  @Get('records/me')
  async mine(@Query('from') from: string, @Query('to') to: string, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.list(u, 'me', from, to), 'Attendance retrieved');
  }

  @Get('records/team')
  async team(@Query('from') from: string, @Query('to') to: string, @Query('employeeId') employeeId: string | undefined, @CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.list(u, 'team', from, to, employeeId ? Number(employeeId) : undefined), 'Attendance retrieved');
  }

  @Put('records/:employeeId/:date')
  async edit(@Param('employeeId', ParseIntPipe) employeeId: number, @Param('date') date: string, @Body() dto: EditAttendanceDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.edit(u, employeeId, date, dto, ip), 'Attendance updated');
  }
}

/** System Settings > Attendance configuration. System Admin only. */
@ApiTags('Attendance configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin)
@Controller('attendance-config')
export class AttendanceConfigController {
  constructor(private readonly service: AttendanceConfigService) {}

  @Get()
  async overview() {
    return ok(await this.service.overview(), 'Attendance configuration retrieved');
  }
  @Post('policies')
  async createPolicy(@Body() dto: PolicyDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.savePolicy(null, dto, u, ip), 'Policy created');
  }
  @Put('policies/:id')
  async updatePolicy(@Param('id', ParseIntPipe) id: number, @Body() dto: PolicyDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.savePolicy(id, dto, u, ip), 'Policy saved');
  }
  @Post('policies/:id/assignments')
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignmentDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.addAssignment(id, dto, u, ip), 'Policy assigned');
  }
  @Delete('assignments/:id')
  async unassign(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.removeAssignment(id, u, ip);
    return ok(null, 'Assignment removed');
  }
  @Post('ramadan')
  async addRamadan(@Body() dto: RamadanDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.addRamadan(dto, u, ip), 'Ramadan period added');
  }
  @Delete('ramadan/:id')
  async removeRamadan(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.removeRamadan(id, u, ip);
    return ok(null, 'Ramadan period removed');
  }
  @Put('branches/:branchId/timezone')
  async branchTimezone(@Param('branchId', ParseIntPipe) branchId: number, @Body() dto: BranchTimezoneDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.setBranchTimezone(branchId, dto.timezone ?? null, u, ip);
    return ok(null, 'Branch timezone saved');
  }
  @Put('settings')
  async settings(@Body() dto: SettingsDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.saveSettings(dto, u, ip), 'Settings saved');
  }
  @Put('statuses/:code')
  async status(@Param('code') code: string, @Body() dto: StatusDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return ok(await this.service.saveStatus(code, dto, u, ip), 'Status saved');
  }
}
