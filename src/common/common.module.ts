import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { PiiService } from './services/pii.service';
import { FileStorageService } from './services/file-storage.service';
import { EmailService } from './services/email.service';
import { SecurityConfigService } from './services/security-config.service';
import { MessagesController } from './controllers/system.controller';

@Global()
@Module({
  controllers: [MessagesController],
  providers: [AuditService, PiiService, FileStorageService, EmailService, SecurityConfigService],
  exports: [AuditService, PiiService, FileStorageService, EmailService, SecurityConfigService],
})
export class CommonModule {}
