import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { BranchesService } from './branches.service';

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
}
