import { IsIn, IsObject, IsOptional } from 'class-validator';
import { COUNTRIES } from '../profile-schema';

/** Body for POST /employee-profile/validate: { country, sections: { personal: { data, custom }, ... } }. */
export class ValidateNewProfileDto {
  @IsOptional()
  @IsIn(COUNTRIES as unknown as string[])
  country?: string;

  @IsObject()
  sections!: Record<string, { data?: Record<string, unknown>; custom?: Record<string, unknown> }>;
}

/**
 * Body for PUT /employees/:id/profile/:section (D-023).
 * `data` holds plain fields and repeatable records (validated against the section schema);
 * `custom` holds admin-defined custom field values by field code.
 */
export class SaveProfileSectionDto {
  @IsObject()
  data!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  custom?: Record<string, unknown>;
}
