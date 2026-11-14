import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceSetupModule } from '../attendance-setup/attendance-setup.module';
import { LeaveController, LeaveConfigController } from './leave.controller';
import { LeavePolicyController } from './leave-policy.controller';
import { LeaveService } from './leave.service';
import { LeaveConfigService } from './leave-config.service';
import { EntitlementService } from './entitlement.service';
import { LeavePolicyService } from './leave-policy.service';

@Module({
  imports: [AttendanceModule, AttendanceSetupModule],
  controllers: [LeaveController, LeaveConfigController, LeavePolicyController],
  providers: [LeaveService, LeaveConfigService, EntitlementService, LeavePolicyService],
})
export class LeaveModule {}
