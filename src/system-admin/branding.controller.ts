import { BadRequestException, Body, Controller, Get, Ip, Patch, Post, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { UploadedFileLike } from '../common/services/file-storage.service';
import { SystemAdminService } from './system-admin.service';
import { UpdateBrandingDto } from './dto/branding.dto';

const LOGO_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

@ApiTags('System Admin')
@Controller('branding')
export class BrandingController {
  constructor(private readonly service: SystemAdminService) {}

  private ok(data: unknown, text: string) {
    return { data, message: { code: 'OK', text } };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SystemAdmin)
  async get() {
    return this.ok(await this.service.getBranding(), 'Branding retrieved');
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SystemAdmin)
  async update(@Body() dto: UpdateBrandingDto, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    return this.ok(await this.service.updateBranding(dto, user, ip), 'Branding updated');
  }

  @Post('logo')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SystemAdmin)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LOGO_UPLOAD_MAX_BYTES, files: 1 } }))
  async uploadLogo(@UploadedFile() file: UploadedFileLike, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    if (!file) throw new BadRequestException('Choose a logo file to upload');
    return this.ok(await this.service.uploadLogo(file, user, ip), 'Logo uploaded');
  }

  @Post('favicon')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.SystemAdmin)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LOGO_UPLOAD_MAX_BYTES, files: 1 } }))
  async uploadFavicon(@UploadedFile() file: UploadedFileLike, @CurrentUser() user: CurrentUserPayload, @Ip() ip: string) {
    if (!file) throw new BadRequestException('Choose a favicon file to upload');
    return this.ok(await this.service.uploadFavicon(file, user, ip), 'Favicon uploaded');
  }

  /** Public, no auth: the login page renders this before anyone signs in (see schema docblock). */
  @Get('logo/file')
  async getLogoFile(@Res() res: Response) {
    const { stream, mimeType } = await this.service.getBrandingFileStream('logoFileId');
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  }

  /** Public, no auth: same reason as the logo. */
  @Get('favicon/file')
  async getFaviconFile(@Res() res: Response) {
    const { stream, mimeType } = await this.service.getBrandingFileStream('faviconFileId');
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(res);
  }
}
