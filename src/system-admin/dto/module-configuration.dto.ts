import { IsBoolean } from 'class-validator';

/** PATCH /module-configurations/:moduleKey — System Admin only. */
export class UpdateModuleConfigurationDto {
  @IsBoolean()
  isEnabled!: boolean;
}
