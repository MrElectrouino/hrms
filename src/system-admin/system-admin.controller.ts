import { Body, Controller, Get, Ip, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { SystemAdminService } from './system-admin.service';
import { CreateSystemConfigurationDto, UpdateSystemConfigurationDto, TestEmailDto } from './dto/system-configuration.dto';

@ApiTags('System Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin)
@Controller('system-configurations')
export class SystemAdminController {
  constructor(private readonly service: SystemAdminService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  @Get()
  async list() {
    return this.ok(await this.service.listConfigurations(), 'System configurations retrieved');
  }

  /** Is email set up, and where would it go? */
  @Get('email/status')
  async emailStatus() {
    return this.ok(this.service.emailStatus(), 'Email status retrieved');
  }

  /** Sends a test email. In development it goes to DEV_MAIL_REDIRECT_TO instead. */
  @Post('email/test')
  async emailTest(@Body() dto: TestEmailDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.sendTestEmail(dto.to, user, ip), 'Test email sent');
  }

  @Post()
  async create(@Body() dto: CreateSystemConfigurationDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.createConfiguration(dto, user, ip), 'Configuration created');
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSystemConfigurationDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.updateConfiguration(id, dto, user, ip), 'Configuration updated');
  }
}
