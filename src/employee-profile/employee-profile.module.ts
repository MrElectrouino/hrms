import { Module } from '@nestjs/common';
import { EmployeeProfileController } from './employee-profile.controller';
import { EmployeeProfileService } from './employee-profile.service';
import { ProfileRulesController } from './profile-rules.controller';
import { ProfileRulesService } from './profile-rules.service';

@Module({
  controllers: [EmployeeProfileController, ProfileRulesController],
  providers: [EmployeeProfileService, ProfileRulesService],
  exports: [EmployeeProfileService],
})
export class EmployeeProfileModule {}
