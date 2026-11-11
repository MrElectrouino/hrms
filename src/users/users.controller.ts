import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserType } from '../common/constants/user-types';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

/** User management is for System Administrators and HR Administrators (D-022). */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin, UserType.HRAdmin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: ListUsersQueryDto) {
    const result = await this.usersService.findAll(query);
    return {
      data: result.items,
      pagination: result.pagination,
      message: { code: 'OK', text: 'Users retrieved successfully' },
    };
  }

  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const created = await this.usersService.create(dto, user, ip);
    return { data: created, message: { code: 'OK', text: 'User created successfully' } };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    return { data: user, message: { code: 'OK', text: 'User retrieved successfully' } };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.usersService.update(id, dto, user, ip);
    return { data: updated, message: { code: 'OK', text: 'User updated successfully' } };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const updated = await this.usersService.remove(id, user, ip);
    return { data: updated, message: { code: 'OK', text: 'User deactivated successfully' } };
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    await this.usersService.resetPassword(id, dto.newPassword, user, ip);
    return { data: null, message: { code: 'OK', text: 'Password reset successfully' } };
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  async unlock(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    await this.usersService.unlock(id, user, ip);
    return { data: null, message: { code: 'OK', text: 'User unlocked' } };
  }

  @Post(':id/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  async revokeSessions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const result = await this.usersService.revokeSessions(id, user, ip);
    return { data: result, message: { code: 'OK', text: 'Sessions signed out' } };
  }
}
