import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { COUNTRIES, CountryCode, FieldRule, ruleCatalog } from './profile-schema';
import { SaveProfileRulesDto } from './dto/profile-rule.dto';

@Injectable()
export class ProfileRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assertCountry(country: string): CountryCode {
    if (!(COUNTRIES as readonly string[]).includes(country)) throw new BadRequestException('Unsupported country');
    return country as CountryCode;
  }

  /** Rules used when building a profile for this country. */
  async rulesFor(country: CountryCode): Promise<FieldRule[]> {
    const rows = await this.prisma.profileFieldRule.findMany({ where: { countryCode: country } });
    return rows.map((r) => ({
      sectionKey: r.sectionKey,
      groupTitle: r.groupTitle,
      fieldKey: r.fieldKey,
      isVisible: r.isVisible,
      isRequired: r.isRequired,
    }));
  }

  /** Admin screen payload: the full catalog for a country plus the current overrides. */
  async getForCountry(countryInput: string) {
    const country = this.assertCountry(countryInput);
    const sections = ruleCatalog(country);
    // Rules for a tab, group or field that no longer exists in the layout are ignored, not shown.
    const exists = (r: FieldRule) => {
      const s = sections.find((x) => x.key === r.sectionKey);
      if (!s) return false;
      if (!r.groupTitle) return true;
      const g = s.groups.find((x) => x.title === r.groupTitle);
      return !!g && (!r.fieldKey || g.fields.some((f) => f.key === r.fieldKey));
    };
    return {
      country,
      countries: COUNTRIES,
      sections,
      rules: (await this.rulesFor(country)).filter(exists),
    };
  }

  /** Replaces all overrides for one country. Only overrides that differ from "inherit" are stored. */
  async saveForCountry(countryInput: string, dto: SaveProfileRulesDto, user: CurrentUserPayload, ip?: string) {
    const country = this.assertCountry(countryInput);
    const catalog = ruleCatalog(country);

    const rows: { sectionKey: string; groupTitle: string; fieldKey: string; isVisible: boolean | null; isRequired: boolean | null }[] = [];
    const seen = new Set<string>();
    for (const r of dto.rules) {
      const groupTitle = r.groupTitle ?? '';
      const fieldKey = r.fieldKey ?? '';
      const isVisible = r.isVisible ?? null;
      const isRequired = r.isRequired ?? null;
      if (isVisible === null && isRequired === null) continue;
      if (fieldKey && !groupTitle) throw new BadRequestException('A field rule needs its group');

      const section = catalog.find((s) => s.key === r.sectionKey);
      if (!section) throw new BadRequestException(`Unknown section "${r.sectionKey}"`);
      const group = groupTitle ? section.groups.find((g) => g.title === groupTitle) : undefined;
      if (groupTitle && !group) throw new BadRequestException(`Unknown group "${groupTitle}" in ${section.title}`);
      const field = fieldKey ? group!.fields.find((f) => f.key === fieldKey) : undefined;
      if (fieldKey && !field) throw new BadRequestException(`Unknown field "${fieldKey}" in ${groupTitle}`);

      if (isVisible === false) {
        if (!groupTitle && section.locked) throw new BadRequestException(`${section.title} cannot be hidden`);
        if (field?.locked) throw new BadRequestException(`${field.label} cannot be hidden`);
      }
      if (isRequired !== null && !fieldKey) throw new BadRequestException('Required applies to fields only');
      if (isRequired === false && field?.locked) throw new BadRequestException(`${field.label} must stay required`);

      const id = `${r.sectionKey}|${groupTitle}|${fieldKey}`;
      if (seen.has(id)) throw new BadRequestException('Duplicate rule in request');
      seen.add(id);
      rows.push({ sectionKey: r.sectionKey, groupTitle, fieldKey, isVisible, isRequired });
    }

    await this.prisma.$transaction([
      this.prisma.profileFieldRule.deleteMany({ where: { countryCode: country } }),
      this.prisma.profileFieldRule.createMany({
        data: rows.map((r) => ({ ...r, countryCode: country, updatedByProfileId: user.profileId })),
      }),
    ]);
    await this.audit.log({
      actorProfileId: user.profileId,
      action: 'PROFILE_RULES_UPDATED',
      entityType: 'ProfileFieldRule',
      entityId: country,
      ipAddress: ip,
      metadata: { rules: rows.length },
    });
    return this.getForCountry(country);
  }

  async resetCountry(countryInput: string, user: CurrentUserPayload, ip?: string) {
    return this.saveForCountry(countryInput, { rules: [] }, user, ip);
  }
}
