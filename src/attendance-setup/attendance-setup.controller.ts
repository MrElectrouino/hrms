import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { EmployeeBranchGuard, EmployeeBodyBranchGuard } from '../common/guards/branch-access.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { AttendanceSetupService } from './attendance-setup.service';
import { RosterService } from './roster.service';
import {
  AssignHolidayCalendarDto,
  AssignPatternDto,
  AssignWorkScheduleDto,
  HolidayCalendarDto,
  HolidayDto,
  HolidayOrderDto,
  RosterEntryDto,
  RosterPatternDto,
  WorkScheduleDto,
} from './dto/attendance.dto';
import { AssignWeeklyOffDto, WeeklyOffTemplateDto } from './dto/weekly-off.dto';

type Upload = { buffer: Buffer; originalname: string; size: number };
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FILE_OPTS = { limits: { fileSize: 2 * 1024 * 1024, files: 1 } };

/** Time & attendance setup: HR Admin and System Admin only. */
@ApiTags('Attendance setup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin, UserType.HRAdmin)
@Controller('attendance')
export class AttendanceSetupController {
  constructor(
    private readonly setup: AttendanceSetupService,
    private readonly roster: RosterService,
  ) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  private file(f: Upload | undefined): Upload {
    if (!f) throw new BadRequestException('Choose an .xlsx file to upload');
    return f;
  }

  private async sendXlsx(buffer: Promise<Buffer>, name: string, res: Response) {
    res.setHeader('Content-Type', XLSX);
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.send(await buffer);
  }

  /* ---- work schedules ---- */
  @Get('work-schedules')
  async schedules() {
    return this.ok(await this.setup.listSchedules(), 'Work schedules retrieved');
  }
  @Post('work-schedules')
  async createSchedule(@Body() dto: WorkScheduleDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.createSchedule(dto, u, ip), 'Work schedule created');
  }
  @Put('work-schedules/:id')
  async updateSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: WorkScheduleDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.updateSchedule(id, dto, u, ip), 'Work schedule updated');
  }

  /* ---- holiday calendars ---- */
  @Get('holiday-order')
  async holidayOrder() {
    return this.ok(await this.setup.getHolidayOrder(), 'Holiday order retrieved');
  }
  @Put('holiday-order')
  async setHolidayOrder(@Body() dto: HolidayOrderDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.setHolidayOrder(dto.order, u, ip), 'Holiday order saved');
  }

  @Get('holiday-calendars')
  async calendars() {
    return this.ok(await this.setup.listCalendars(), 'Holiday calendars retrieved');
  }
  @Get('weekly-off-templates')
  async weeklyOffTemplates() {
    return this.ok(await this.setup.listWeeklyOffTemplates(), 'Weekly off templates retrieved');
  }
  @Post('weekly-off-templates')
  async createWeeklyOff(@Body() dto: WeeklyOffTemplateDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.createWeeklyOffTemplate(dto, u, ip), 'Weekly off template created');
  }
  @Put('weekly-off-templates/:id')
  async updateWeeklyOff(@Param('id', ParseIntPipe) id: number, @Body() dto: WeeklyOffTemplateDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.updateWeeklyOffTemplate(id, dto, u, ip), 'Weekly off template saved');
  }
  @Delete('weekly-off-templates/:id')
  async deleteWeeklyOff(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.setup.deleteWeeklyOffTemplate(id, u, ip);
    return this.ok(null, 'Weekly off template deleted');
  }
  @Post('employees/:employeeId/weekly-off')
  @UseGuards(EmployeeBranchGuard)
  async assignWeeklyOff(@Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: AssignWeeklyOffDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.assignWeeklyOff(employeeId, dto, u, ip), 'Weekly off assigned');
  }

  @Post('holiday-calendars')
  async createCalendar(@Body() dto: HolidayCalendarDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.createCalendar(dto, u, ip), 'Holiday calendar created');
  }
  @Get('holiday-calendars/template')
  async holidayTemplate(@Res() res: Response) {
    return this.sendXlsx(this.setup.holidayTemplate(), 'holidays-template.xlsx', res);
  }
  @Get('holiday-calendars/:id')
  async calendar(@Param('id', ParseIntPipe) id: number) {
    return this.ok(await this.setup.getCalendar(id), 'Holiday calendar retrieved');
  }
  @Put('holiday-calendars/:id')
  async updateCalendar(@Param('id', ParseIntPipe) id: number, @Body() dto: HolidayCalendarDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.updateCalendar(id, dto, u, ip), 'Holiday calendar updated');
  }
  @Post('holiday-calendars/:id/holidays')
  async saveHoliday(@Param('id', ParseIntPipe) id: number, @Body() dto: HolidayDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.saveHoliday(id, dto, u, ip), 'Holiday saved');
  }
  @Delete('holiday-calendars/:id/holidays/:holidayId')
  async removeHoliday(@Param('id', ParseIntPipe) id: number, @Param('holidayId', ParseIntPipe) holidayId: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.setup.removeHoliday(id, holidayId, u, ip);
    return this.ok(null, 'Holiday removed');
  }
  @Post('holiday-calendars/:id/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  async importHolidays(@Param('id', ParseIntPipe) id: number, @UploadedFile() f: Upload, @Query('commit') commit: string, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.importHolidays(id, this.file(f), commit === 'true', u, ip), 'Holiday file checked');
  }

  /* ---- roster patterns ---- */
  @Get('roster-patterns')
  async patterns() {
    return this.ok(await this.setup.listPatterns(), 'Roster patterns retrieved');
  }
  @Post('roster-patterns')
  async createPattern(@Body() dto: RosterPatternDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.createPattern(dto, u, ip), 'Roster pattern created');
  }
  @Put('roster-patterns/:id')
  async updatePattern(@Param('id', ParseIntPipe) id: number, @Body() dto: RosterPatternDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.updatePattern(id, dto, u, ip), 'Roster pattern updated');
  }

  /* ---- roster: single days and Excel ---- */
  @Put('roster/entries')
  @UseGuards(EmployeeBodyBranchGuard)
  async setEntry(@Body() dto: RosterEntryDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.roster.setEntry(dto, u, ip), 'Roster entry saved');
  }
  @Get('roster/template')
  async rosterTemplate(@Res() res: Response) {
    return this.sendXlsx(this.roster.rosterTemplate(), 'roster-template.xlsx', res);
  }
  @Post('roster/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', FILE_OPTS))
  async importRoster(@UploadedFile() f: Upload, @Query('commit') commit: string, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.roster.importRoster(this.file(f), commit === 'true', u, ip), 'Roster file checked');
  }
  @Get('imports')
  async imports() {
    return this.ok(await this.roster.importHistory(), 'Import history retrieved');
  }

  /* ---- per employee ---- */
  @Get('employees/:id/calendar')
  @UseGuards(EmployeeBranchGuard)
  async employeeCalendar(@Param('id', ParseIntPipe) id: number, @Query('from') from: string, @Query('to') to: string) {
    return this.ok(await this.roster.resolveRange(id, from, to), 'Calendar retrieved');
  }
  @Get('employees/:id/assignments')
  @UseGuards(EmployeeBranchGuard)
  async assignments(@Param('id', ParseIntPipe) id: number) {
    return this.ok(await this.setup.listAssignments(id), 'Assignments retrieved');
  }
  @Post('employees/:id/work-schedule')
  @UseGuards(EmployeeBranchGuard)
  async assignSchedule(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignWorkScheduleDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.assignWorkSchedule(id, dto, u, ip), 'Work schedule assigned');
  }
  @Post('employees/:id/roster-pattern')
  @UseGuards(EmployeeBranchGuard)
  async assignPattern(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignPatternDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.assignPattern(id, dto, u, ip), 'Roster pattern assigned');
  }
  @Post('employees/:id/holiday-calendar')
  @UseGuards(EmployeeBranchGuard)
  async assignCalendar(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignHolidayCalendarDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.setup.assignHolidayCalendar(id, dto, u, ip), 'Holiday calendar assigned');
  }
  @Delete('employees/:id/assignments/:kind/:assignmentId')
  @UseGuards(EmployeeBranchGuard)
  async removeAssignment(@Param('id', ParseIntPipe) id: number, @Param('kind') kind: string, @Param('assignmentId', ParseIntPipe) assignmentId: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.setup.removeAssignment(id, kind, assignmentId, u, ip);
    return this.ok(null, 'Assignment removed');
  }
  @Delete('employees/:id/roster/:date')
  @UseGuards(EmployeeBranchGuard)
  async clearEntry(@Param('id', ParseIntPipe) id: number, @Param('date') date: string, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.roster.clearEntry(id, date, u, ip);
    return this.ok(null, 'Roster entry removed');
  }
}
