import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { FileStorageService, UploadedFileLike } from '../common/services/file-storage.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { CreateSystemConfigurationDto, UpdateSystemConfigurationDto } from './dto/system-configuration.dto';
import { CreateCountryDto, UpdateCountryDto } from './dto/country.dto';
import { UpdateBrandingDto } from './dto/branding.dto';
import { UpdateModuleConfigurationDto } from './dto/module-configuration.dto';

const BRANDING_ID = 1;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];
const FAVICON_EXTENSIONS = ['.png', '.ico'];

function assertValidBrandingImage(file: UploadedFileLike, allowedExtensions: string[]): void {
  const name = (file.originalname || '').toLowerCase();
  const ext = name.slice(name.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) {
    throw new BadRequestException(`File must be one of: ${allowedExtensions.join(', ')}`);
  }
  if (!file.size || file.size > LOGO_MAX_BYTES) {
    throw new BadRequestException('File must be smaller than 2 MB');
  }
}

/** Configs with a known, closed set of valid values (System Admin > Regional Settings). */
const KNOWN_VALUE_CONSTRAINTS: Record<string, string[]> = {
  'Default Time Format': ['12', '24'],
};

@Injectable()
export class SystemAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: FileStorageService,
  ) {}

  async listConfigurations() {
    return this.prisma.systemConfiguration.findMany({ orderBy: { id: 'asc' } });
  }

  async createConfiguration(dto: CreateSystemConfigurationDto, user: CurrentUserPayload, ip: string) {
    if (await this.prisma.systemConfiguration.findUnique({ where: { name: dto.name } })) {
      throw new ConflictException(`A configuration named "${dto.name}" already exists`);
    }
    await this.assertKnownValue(dto.name, dto.value);
    const created = await this.prisma.systemConfiguration.create({
      data: {
        name: dto.name,
        value: dto.value ?? null,
        valueKind: dto.valueKind ?? 'string',
        description: dto.description ?? null,
      },
    });
    await this.audit.log({
      actorProfileId: user.profileId,
      action: 'system_configuration.created',
      entityType: 'system_configuration',
      entityId: String(created.id),
      ipAddress: ip,
      metadata: { name: dto.name },
    });
    return created;
  }

  async updateConfiguration(id: number, dto: UpdateSystemConfigurationDto, user: CurrentUserPayload, ip: string) {
    const existing = await this.prisma.systemConfiguration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Configuration not found');
    await this.assertKnownValue(existing.name, dto.value);
    if (existing.valueKind === 'date' && dto.value && !/^\d{4}-\d{2}-\d{2}$/.test(dto.value)) {
      throw new BadRequestException(`"${existing.name}" must be a date (YYYY-MM-DD)`);
    }
    const updated = await this.prisma.systemConfiguration.update({
      where: { id },
      data: {
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
    await this.audit.log({
      actorProfileId: user.profileId,
      action: 'system_configuration.updated',
      entityType: 'system_configuration',
      entityId: String(id),
      ipAddress: ip,
      metadata: { name: existing.name, from: existing.value, to: dto.value },
    });
    return updated;
  }

  private async assertKnownValue(name: string, value: string | undefined) {
    if (value === undefined) return;
    if (name === 'Default Country') {
      // The company country must be one of the active countries in the country list.
      const found = await this.prisma.country.findFirst({ where: { isoCode: value, isActive: true }, select: { id: true } });
      if (!found) throw new BadRequestException('"Default Country" must be an active country. Add it under System settings > Countries first.');
      return;
    }
    const allowed = KNOWN_VALUE_CONSTRAINTS[name];
    if (allowed && !allowed.includes(value)) {
      throw new BadRequestException(`"${name}" must be one of: ${allowed.join(', ')}`);
    }
  }

  /* -------------------------------------------------------------- country configuration (§D) */

  async listCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  async createCountry(dto: CreateCountryDto, user: CurrentUserPayload, ip: string) {
    if (await this.prisma.country.findUnique({ where: { isoCode: dto.isoCode } })) {
      throw new ConflictException(`A country with ISO code "${dto.isoCode}" already exists`);
    }
    const created = await this.prisma.country.create({ data: dto });
    await this.audit.log({
      actorProfileId: user.profileId,
      action: 'country.created',
      entityType: 'country',
      entityId: dto.isoCode,
      ipAddress: ip,
      metadata: { name: dto.name },
    });
    return created;
  }

  async updateCountry(id: number, dto: UpdateCountryDto, user: CurrentUserPayload, ip: string) {
    const existing = await this.prisma.country.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Country not found');
    const updated = await this.prisma.country.update({ where: { id }, data: dto });
    await this.audit.log({
      actorProfileId: user.profileId,
      action: 'country.updated',
      entityType: 'country',
      entityId: existing.isoCode,
      ipAddress: ip,
      metadata: { changed: Object.keys(dto) },
    });
    return updated;
  }

  /* -------------------------------------------------------------- application branding (§A) */

  /** Singleton row, created lazily on first read so the app works before any admin touches it. */
  async getBranding() {
    return this.prisma.applicationBranding.upsert({
      where: { id: BRANDING_ID },
      create: { id: BRANDING_ID },
      update: {},
      include: { logoFile: true, faviconFile: true },
    });
  }

  /** Public (no auth): only the cosmetic fields the app shell and login page need. */
  async getPublicBranding() {
    const b = await this.getBranding();
    return {
      appName: b.appName,
      primaryColor: b.primaryColor,
      secondaryColor: b.secondaryColor,
      accentColor: b.accentColor,
      loginBrandingText: b.loginBrandingText,
      footerText: b.footerText,
      hasLogo: !!b.logoFileId,
      hasFavicon: !!b.faviconFileId,
      version: b.updatedAt.getTime().toString(),
    };
  }

  async updateBranding(dto: UpdateBrandingDto, user: CurrentUserPayload, ip: string) {
    await this.getBranding(); // ensure the singleton row exists
    const updated = await this.prisma.applicationBranding.update({
      where: { id: BRANDING_ID },
      data: { ...dto, updatedByProfileId: user.profileId },
      include: { logoFile: true, faviconFile: true },
    });
    await this.audit.log({
      actorProfileId: user.profileId,
      action: 'branding.updated',
      entityType: 'application_branding',
      entityId: String(BRANDING_ID),
      ipAddress: ip,
      metadata: { changed: Object.keys(dto) },
    });
    return updated;
  }

  async uploadLogo(file: UploadedFileLike, user: CurrentUserPayload, ip: string) {
    return this.uploadBrandingImage(file, LOGO_EXTENSIONS, 'logoFileId', 'branding.logo_uploaded', user, ip);
  }

  async uploadFavicon(file: UploadedFileLike, user: CurrentUserPayload, ip: string) {
    return this.uploadBrandingImage(file, FAVICON_EXTENSIONS, 'faviconFileId', 'branding.favicon_uploaded', user, ip);
  }

  private async uploadBrandingImage(
    file: UploadedFileLike,
    allowedExtensions: string[],
    column: 'logoFileId' | 'faviconFileId',
    auditAction: string,
    user: CurrentUserPayload,
    ip: string,
  ) {
    assertValidBrandingImage(file, allowedExtensions);
    await this.getBranding(); // ensure the singleton row exists

    const stored = await this.storage.saveFile(file);
    const storedFile = await this.prisma.storedFile.create({
      data: {
        originalName: stored.originalName,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: BigInt(stored.sizeBytes),
        sha256: stored.sha256,
        createdById: user.profileId,
      },
    });

    const updated = await this.prisma.applicationBranding.update({
      where: { id: BRANDING_ID },
      data: { [column]: storedFile.id, updatedByProfileId: user.profileId },
      include: { logoFile: true, faviconFile: true },
    });

    await this.audit.log({
      actorProfileId: user.profileId,
      action: auditAction,
      entityType: 'application_branding',
      entityId: String(BRANDING_ID),
      ipAddress: ip,
      metadata: { originalName: stored.originalName },
    });
    return updated;
  }

  /** Public (no auth): the login page needs these before anyone signs in. */
  async getBrandingFileStream(column: 'logoFileId' | 'faviconFileId') {
    const branding = await this.prisma.applicationBranding.findUnique({
      where: { id: BRANDING_ID },
      include: { logoFile: true, faviconFile: true },
    });
    const file = column === 'logoFileId' ? branding?.logoFile : branding?.faviconFile;
    if (!file) throw new NotFoundException('Not set');
    return { stream: this.storage.readFile(file.storageKey), mimeType: file.mimeType };
  }

  /* -------------------------------------------------------------- module configuration (§G) */

  async listModules() {
    return this.prisma.moduleConfiguration.findMany({ orderBy: { displayOrder: 'asc' } });
  }

  async updateModule(moduleKey: string, dto: UpdateModuleConfigurationDto, user: CurrentUserPayload, ip: string) {
    const all = await this.prisma.moduleConfiguration.findMany();
    const target = all.find((m) => m.moduleKey === moduleKey);
    if (!target) throw new NotFoundException('Module not found');

    if (dto.isEnabled) {
      const missingDeps = target.dependsOn.filter((dep) => !all.find((m) => m.moduleKey === dep)?.isEnabled);
      if (missingDeps.length > 0) {
        const names = missingDeps.map((k) => all.find((m) => m.moduleKey === k)?.name ?? k);
        throw new BadRequestException(`Enable ${names.join(', ')} first — ${target.name} depends on them`);
      }
    } else {
      const dependents = all.filter((m) => m.isEnabled && m.dependsOn.includes(moduleKey));
      if (dependents.length > 0) {
        throw new BadRequestException(`Disable ${dependents.map((m) => m.name).join(', ')} first — they depend on ${target.name}`);
      }
    }

    const updated = await this.prisma.moduleConfiguration.update({
      where: { moduleKey },
      data: { isEnabled: dto.isEnabled, updatedByProfileId: user.profileId },
    });
    await this.audit.log({
      actorProfileId: user.profileId,
      action: dto.isEnabled ? 'module.enabled' : 'module.disabled',
      entityType: 'module_configuration',
      entityId: moduleKey,
      ipAddress: ip,
    });
    return updated;
  }
}
