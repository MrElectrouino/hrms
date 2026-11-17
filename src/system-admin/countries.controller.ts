import { Body, Controller, Get, Ip, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { SystemAdminService } from './system-admin.service';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';

@ApiTags('System Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin)
@Controller('countries')
export class CountriesController {
  constructor(private readonly service: SystemAdminService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  // HR Admin also needs the country list to scope document types by country.
  @Get()
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async list() {
    return this.ok(await this.service.listCountries(), 'Countries retrieved');
  }

  @Post()
  async create(@Body() dto: CreateCountryDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.createCountry(dto, user, ip), 'Country created');
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCountryDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    return this.ok(await this.service.updateCountry(id, dto, user, ip), 'Country updated');
  }
}
