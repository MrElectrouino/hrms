import { Module } from '@nestjs/common';
import { AttendanceSetupModule } from '../attendance-setup/attendance-setup.module';
import { AttendanceController, AttendanceConfigController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceConfigService } from './attendance-config.service';
import { AttendanceProcessingService } from './attendance-processing.service';
import { RegularizationService } from './regularization.service';
import { AttendanceReportsService } from './attendance-reports.service';

@Module({
  imports: [AttendanceSetupModule],
  controllers: [AttendanceController, AttendanceConfigController],
  providers: [AttendanceService, AttendanceConfigService, AttendanceProcessingService, RegularizationService, AttendanceReportsService],
  exports: [AttendanceService, AttendanceProcessingService],
})
export class AttendanceModule {}
