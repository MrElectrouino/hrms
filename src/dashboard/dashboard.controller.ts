import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

const ok = (data: unknown, text: string) => ({ data, message: { code: 'OK', text } });

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  async summary(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.summary(u), 'Dashboard retrieved');
  }

  @Get('notifications')
  async notifications(@CurrentUser() u: CurrentUserPayload) {
    return ok(await this.service.notifications(u), 'Notifications retrieved');
  }
}
