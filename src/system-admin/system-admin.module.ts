import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller';
import { CountriesController } from './countries.controller';
import { BrandingController } from './branding.controller';
import { ModuleConfigurationController } from './module-configuration.controller';
import { SystemAdminService } from './system-admin.service';

@Module({
  controllers: [SystemAdminController, CountriesController, BrandingController, ModuleConfigurationController],
  providers: [SystemAdminService],
})
export class SystemAdminModule {}
