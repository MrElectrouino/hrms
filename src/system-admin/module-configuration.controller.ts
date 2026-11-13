import { Body, Controller, Get, Ip, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { SystemAdminService } from './system-admin.service';
import { UpdateModuleConfigurationDto } from './dto/module-configuration.dto';

@ApiTags('System Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin)
@Controller('module-configurations')
export class ModuleConfigurationController {
  constructor(private readonly service: SystemAdminService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  @Get()
  async list() {
    return this.ok(await this.service.listModules(), 'Modules retrieved');
  }

  @Patch(':moduleKey')
  async update(
    @Param('moduleKey') moduleKey: string,
    @Body() dto: UpdateModuleConfigurationDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.updateModule(moduleKey, dto, user, ip), 'Module updated');
  }
}
