import { IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class AdminResetPasswordDto {
  /** Leave out to generate a random temporary password (returned once in the response). */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Password must contain upper, lower, digit, and special characters',
  })
  newPassword?: string;
}
