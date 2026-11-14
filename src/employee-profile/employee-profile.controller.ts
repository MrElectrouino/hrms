import { Body, Controller, Get, Ip, Param, Patch, Post, Put, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CreateSalaryTemplateDto, UpdateSalaryTemplateDto } from './dto/salary-template.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { EmployeeProfileService } from './employee-profile.service';
import { EmployeeBranchGuard } from '../common/guards/branch-access.guard';
import { SaveProfileSectionDto, ValidateNewProfileDto } from './dto/save-profile-section.dto';
import { CreateCustomFieldDto, UpdateCustomFieldDto } from './dto/custom-field.dto';

@ApiTags('Employee profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EmployeeProfileController {
  constructor(private readonly service: EmployeeProfileService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  /** Any signed-in user may read their own profile; HR/System Admin may read any (service enforces). */
  @Get('employees/:id/profile')
  @UseGuards(EmployeeBranchGuard)
  async getProfile(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.ok(await this.service.getProfile(id, user), 'Employee profile retrieved');
  }

  /** Saving a section is HR and System Admin only. */
  @Put('employees/:id/profile/:section')
  @UseGuards(EmployeeBranchGuard)
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async saveSection(
    @Param('id', ParseIntPipe) id: number,
    @Param('section') section: string,
    @Body() body: SaveProfileSectionDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.saveSection(id, section, body, user, ip), 'Section saved');
  }

  /** Blank nine-section form for Add Employee (HR Admin and System Admin). */
  @Get('employee-profile/blank')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async blankProfile(@Query('country') country: string, @CurrentUser() user: CurrentUserPayload) {
    return this.ok(await this.service.getBlankProfile(country, user), 'Blank profile form');
  }

  /** Add Employee: check all sections before creating the employee. Nothing is saved. */
  @Post('employee-profile/validate')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async validateNewProfile(@Body() body: ValidateNewProfileDto, @CurrentUser() user: CurrentUserPayload) {
    return this.ok(await this.service.validateNewProfile(body.country, body.sections as any, user), 'Profile checked');
  }

  /* ---------------- salary templates (D-024): HR Admin and System Admin ---------------- */

  @Get('salary-templates')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async listSalaryTemplates() {
    return this.ok(await this.service.listSalaryTemplates(), 'Salary templates retrieved');
  }

  @Post('salary-templates')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async createSalaryTemplate(@Body() dto: CreateSalaryTemplateDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.createSalaryTemplate(dto, user, ip), 'Salary template created');
  }

  @Patch('salary-templates/:id')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async updateSalaryTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSalaryTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.updateSalaryTemplate(id, dto, user, ip), 'Salary template updated');
  }

  @Get('custom-fields')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async listCustomFields() {
    return this.ok(await this.service.listCustomFields(), 'Custom fields retrieved');
  }

  /** System Admin only (D-023). */
  @Post('custom-fields')
  @Roles(UserType.SystemAdmin)
  async createCustomField(@Body() dto: CreateCustomFieldDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.createCustomField(dto, user, ip), 'Custom field created');
  }

  @Patch('custom-fields/:code')
  @Roles(UserType.SystemAdmin)
  async updateCustomField(
    @Param('code') code: string,
    @Body() dto: UpdateCustomFieldDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.updateCustomField(code, dto, user, ip), 'Custom field updated');
  }
}
