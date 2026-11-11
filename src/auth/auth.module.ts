import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

/** Minimum HS256 key length. A missing or short secret stops startup instead of signing weak tokens. */
const MIN_JWT_SECRET_LENGTH = 32;

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('app.jwt.secret') ?? '';
        if (secret.length < MIN_JWT_SECRET_LENGTH) {
          throw new Error(`JWT_SECRET must be set to at least ${MIN_JWT_SECRET_LENGTH} characters`);
        }
        return { secret };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtStrategy],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
