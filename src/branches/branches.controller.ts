import { Body, Controller, Delete, Get, Ip, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { BranchesService } from './branches.service';
import { BranchDto } from './dto/branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  /** Any signed-in user: the branches they may switch between. */
  @Get('mine')
  async mine(@CurrentUser() user: CurrentUserPayload) {
    return this.ok(await this.service.mine(user), 'Branches retrieved');
  }

  /** All active branches (to give an account branch access). */
  @Get()
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async all() {
    return this.ok(await this.service.all(), 'Branches retrieved');
  }

  /** The Branches screen: every branch plus the country list. */
  @Get('manage')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async manage() {
    return this.ok(await this.service.manage(), 'Branches retrieved');
  }

  @Post()
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async create(@Body() dto: BranchDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.create(dto, u, ip), 'Branch created');
  }

  @Put(':id')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: BranchDto, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.update(id, dto, u, ip), 'Branch saved');
  }

  @Delete(':id')
  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: CurrentUserPayload, @Ip() ip: string) {
    await this.service.remove(id, u, ip);
    return this.ok(null, 'Branch deleted');
  }
}
