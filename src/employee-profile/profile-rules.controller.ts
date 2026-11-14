import { Body, Controller, Delete, Get, Ip, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { ProfileRulesService } from './profile-rules.service';
import { SaveProfileRulesDto } from './dto/profile-rule.dto';

@ApiTags('Profile field rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin)
@Controller('profile-rules')
export class ProfileRulesController {
  constructor(private readonly service: ProfileRulesService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  @Get(':country')
  async get(@Param('country') country: string) {
    return this.ok(await this.service.getForCountry(country), 'Profile field rules retrieved');
  }

  @Put(':country')
  async save(
    @Param('country') country: string,
    @Body() dto: SaveProfileRulesDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.saveForCountry(country, dto, user, ip), 'Profile field rules saved');
  }

  @Delete(':country')
  async reset(@Param('country') country: string, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.resetCountry(country, user, ip), 'Profile field rules reset');
  }
}
