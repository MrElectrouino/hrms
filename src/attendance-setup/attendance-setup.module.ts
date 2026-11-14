import { Module } from '@nestjs/common';
import { AttendanceSetupController } from './attendance-setup.controller';
import { AttendanceSetupService } from './attendance-setup.service';
import { RosterService } from './roster.service';

@Module({
  controllers: [AttendanceSetupController],
  providers: [AttendanceSetupService, RosterService],
  exports: [RosterService, AttendanceSetupService],
})
export class AttendanceSetupModule {}
