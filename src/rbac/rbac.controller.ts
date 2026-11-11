import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserType } from '../common/constants/user-types';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SetMenuPermissionsDto } from './dto/set-menu-permissions.dto';
import { SetMenuOverridesDto } from './dto/set-menu-overrides.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/menu-item.dto';

/**
 * Roles, rights and menus (D-022). Reads: System and HR administrators.
 * Writes: System administrators only. `my-menu` is open to any signed-in user.
 */
@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SystemAdmin, UserType.HRAdmin)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('user-types')
  async userTypes() {
    const items = await this.rbacService.listUserTypes();
    return { data: items, message: { code: 'OK', text: 'User types retrieved' } };
  }

  @Get('roles')
  async roles() {
    const items = await this.rbacService.listRoles();
    return { data: items, message: { code: 'OK', text: 'Roles retrieved' } };
  }

  @Get('menu-items')
  async menuItems() {
    const items = await this.rbacService.listMenuItems();
    return { data: items, message: { code: 'OK', text: 'Menu items retrieved' } };
  }

  @Get('menu-items/tree')
  async menuTree() {
    const tree = await this.rbacService.getMenuTree();
    return { data: tree, message: { code: 'OK', text: 'Menu tree retrieved' } };
  }

  @Post('menu-items')
  @Roles(UserType.SystemAdmin)
  async createMenuItem(
    @Body() dto: CreateMenuItemDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const item = await this.rbacService.createMenuItem(dto, user.profileId, ip);
    return { data: item, message: { code: 'OK', text: 'Menu item created' } };
  }

  @Patch('menu-items/:id')
  @Roles(UserType.SystemAdmin)
  async updateMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const item = await this.rbacService.updateMenuItem(id, dto, user.profileId, ip);
    return { data: item, message: { code: 'OK', text: 'Menu item updated' } };
  }

  @Get('menu-permissions/:userTypeId')
  async menuPermissions(@Param('userTypeId', ParseIntPipe) userTypeId: number) {
    const items = await this.rbacService.getMenuPermissions(userTypeId);
    return { data: items, message: { code: 'OK', text: 'Menu permissions retrieved' } };
  }

  @Put('menu-permissions/:userTypeId')
  @Roles(UserType.SystemAdmin)
  async setMenuPermissions(
    @Param('userTypeId', ParseIntPipe) userTypeId: number,
    @Body() dto: SetMenuPermissionsDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const items = await this.rbacService.setMenuPermissions(userTypeId, dto.permissions, user.profileId, ip);
    return { data: items, message: { code: 'OK', text: 'Menu permissions updated' } };
  }

  @Get('menu-overrides/:userId')
  async menuOverrides(@Param('userId', ParseIntPipe) userId: number) {
    const items = await this.rbacService.getMenuOverrides(userId);
    return { data: items, message: { code: 'OK', text: 'Menu overrides retrieved' } };
  }

  @Put('menu-overrides/:userId')
  @Roles(UserType.SystemAdmin)
  async setMenuOverrides(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SetMenuOverridesDto,
    @CurrentUser() user: CurrentUserPayload,
    @Ip() ip: string,
  ) {
    const items = await this.rbacService.setMenuOverrides(userId, dto.overrides, user.profileId, ip);
    return { data: items, message: { code: 'OK', text: 'Menu overrides updated' } };
  }

  /** Empty @Roles() overrides the class-level restriction: any signed-in user. */
  @Get('my-menu')
  @Roles()
  async myMenu(@CurrentUser() user: CurrentUserPayload) {
    const tree = await this.rbacService.getMyMenu(user.userId, user.userTypeId);
    return { data: tree, message: { code: 'OK', text: 'My menu retrieved' } };
  }
}
