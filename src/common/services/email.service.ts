import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { routeEmail } from './email-routing';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;
  private readonly nodeEnv: string;
  private readonly devRedirectTo: string;

  constructor(private readonly config: ConfigService) {
    const smtpHost = this.config.get<string>('app.email.smtpHost', '');
    const smtpPort = this.config.get<number>('app.email.smtpPort', 587);
    const smtpSecure = this.config.get<boolean>('app.email.smtpSecure', false);
    const smtpUser = this.config.get<string>('app.email.smtpUser', '');
    const smtpPass = this.config.get<string>('app.email.smtpPass', '');
    this.from = this.config.get<string>('app.email.from', 'no-reply@example.com');
    this.nodeEnv = this.config.get<string>('app.nodeEnv', 'development');
    this.devRedirectTo = this.config.get<string>('app.email.devRedirectTo', '');
    if (this.nodeEnv === 'production' && this.devRedirectTo) {
      this.logger.warn('DEV_MAIL_REDIRECT_TO is set but ignored in production.');
    } else if (this.devRedirectTo) {
      this.logger.warn('All email is redirected to the development mailbox (DEV_MAIL_REDIRECT_TO).');
    }

    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: smtpUser
          ? {
              user: smtpUser,
              pass: smtpPass,
            }
          : undefined,
      });
    }
  }

  /** What a test needs to know: is mail set up, and where does it really go? */
  status() {
    const redirected = this.nodeEnv !== 'production' && this.devRedirectTo.trim() !== '';
    return {
      configured: !!this.transporter,
      host: this.config.get<string>('app.email.smtpHost', ''),
      port: this.config.get<number>('app.email.smtpPort', 587),
      from: this.from,
      environment: this.nodeEnv,
      redirectedTo: redirected ? this.devRedirectTo.trim() : null,
    };
  }

  async send(original: EmailMessage): Promise<void> {
    const message = routeEmail(original, this.nodeEnv, this.devRedirectTo);
    if (!this.transporter) {
      this.logger.warn('SMTP not configured; email would be sent:', {
        to: message.to,
        subject: message.subject,
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(`Email sent to ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`);
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }
}
