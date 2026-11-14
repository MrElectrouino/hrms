import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceSetupModule } from '../attendance-setup/attendance-setup.module';
import { LeaveController, LeaveConfigController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeaveConfigService } from './leave-config.service';

@Module({
  imports: [AttendanceModule, AttendanceSetupModule],
  controllers: [LeaveController, LeaveConfigController],
  providers: [LeaveService, LeaveConfigService],
})
export class LeaveModule {}
