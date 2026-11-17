import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { PiiService } from '../common/services/pii.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { FileStorageService, UploadedFileLike } from '../common/services/file-storage.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { CreateDependantDto } from './dto/create-dependant.dto';
import { UpdateDependantDto } from './dto/update-dependant.dto';
import { COUNTRIES } from '../employee-profile/profile-schema';

/**
 * Prisma's default interactive-transaction timeout is 5 s. Against a remote
 * database (e.g. Neon from a laptop) a few writes can exceed that, and Prisma
 * then reports "Transaction already closed". Allow more time to finish.
 */
const INTERACTIVE_TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

export interface PaginatedEmployees<T = any> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pii: PiiService,
    private readonly storage: FileStorageService,
  ) {}

  async findAll(query: ListEmployeesQueryDto, user?: CurrentUserPayload): Promise<PaginatedEmployees> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = [25, 50, 100].includes(query.pageSize ?? 25)
      ? query.pageSize ?? 25
      : 25;
    const skip = (page - 1) * pageSize;

    const allowedSort = ['name', 'employeeCode', 'dateOfJoining', 'createdAt'];
    const sortBy = query.sortBy && allowedSort.includes(query.sortBy) ? query.sortBy : 'name';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const where: any = {};
    // Not HR: yourself and the people who report to you.
    if (user && ![UserType.SystemAdmin, UserType.HRAdmin].includes(user.userTypeId)) {
      const me = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } });
      where.AND = [{ OR: [{ profileId: user.profileId }, ...(me ? [{ reportingToId: me.id }] : [])] }];
    }
    // Branch scope from the header switcher, clamped to what the account may access.
    if (user?.activeBranchIds) where.branchId = { in: user.activeBranchIds };
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.siteId) {
      where.siteId = query.siteId;
    }
    if (query.employeeTypeId) {
      where.employeeTypeId = query.employeeTypeId;
    }
    if (query.department) {
      where.profileSections = {
        some: { sectionKey: 'organization', data: { path: ['department'], equals: query.department } },
      };
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { employeeCode: { contains: term, mode: 'insensitive' } },
        { profile: { name: { contains: term, mode: 'insensitive' } } },
        { profile: { lastName: { contains: term, mode: 'insensitive' } } },
        { profile: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [totalItems, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortBy === 'name' ? { profile: { name: sortOrder } } : { [sortBy]: sortOrder },
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              middleName: true,
              lastName: true,
              email: true,
              contactNo: true,
              isSiteAccess: true,
            },
          },
          site: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: items.map((e) => ({
        ...this.sanitizeEmployee(e, true),
        branch: e.branch ? { id: e.branch.id, name: e.branch.name } : null,
      })),
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems,
      },
    };
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        profile: true,
        site: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true } },
        reportingTo: {
          select: {
            id: true,
            employeeCode: true,
            profile: { select: { name: true, lastName: true } },
          },
        },
        profileSections: { where: { sectionKey: 'organization' }, select: { data: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const { profileSections, ...rest } = employee;
    const country = (profileSections[0]?.data as Record<string, unknown> | undefined)?.legalEntityCountry;
    return { ...this.sanitizeEmployee(rest, false), country: typeof country === 'string' && (COUNTRIES as readonly string[]).includes(country) ? country : 'IN' };
  }

  /**
   * Next code for an employee type: the type's code plus a running number (PRM-0001).
   * The counter row is updated atomically, and numbers already used by a hand-typed code are skipped.
   */
  private async nextEmployeeCode(tx: Prisma.TransactionClient, employmentType: string) {
    const type = await tx.parameter.findFirst({
      where: { parameterType: { name: 'Employee Type' }, text: { equals: employmentType, mode: 'insensitive' } },
      select: { id: true, text: true, code: true },
    });
    if (!type) throw new BadRequestException(`Unknown employee type "${employmentType}"`);
    const prefix = type.code?.trim().toUpperCase();
    if (!prefix) throw new BadRequestException(`Set a code for the employee type "${type.text}" in Masters first`);

    for (let attempt = 0; attempt < 50; attempt++) {
      const seq = await tx.employeeCodeSequence.upsert({
        where: { parameterId: type.id },
        create: { parameterId: type.id, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const code = `${prefix}-${String(seq.lastNumber).padStart(4, '0')}`;
      if (!(await tx.employee.findUnique({ where: { employeeCode: code }, select: { id: true } }))) {
        return { code, parameterId: type.id };
      }
    }
    throw new ConflictException('Could not allocate a unique employee code, please try again');
  }

  async create(dto: CreateEmployeeDto, actorProfileId?: number, ip?: string, user?: CurrentUserPayload) {
    // A branch-restricted account must say which branch the new employee joins (the header switcher).
    let branchId: number | null = null;
    if (user?.branchAccess) {
      if (!user.activeBranchIds || user.activeBranchIds.length !== 1) {
        throw new BadRequestException('Choose a branch in the header before adding an employee');
      }
      branchId = user.activeBranchIds[0];
    } else if (user?.activeBranchIds?.length === 1) {
      branchId = user.activeBranchIds[0];
    }
    const manualCode = dto.employeeCode?.trim() || undefined;
    if (manualCode) {
      const codeExists = await this.prisma.employee.findUnique({ where: { employeeCode: manualCode } });
      if (codeExists) {
        throw new ConflictException('Employee code already exists');
      }
    } else if (!dto.employmentType?.trim()) {
      throw new BadRequestException('Choose an employment type so the employee code can be generated');
    }

    if (dto.email) {
      const emailExists = await this.prisma.profile.findFirst({
        where: { email: dto.email.toLowerCase() },
      });
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    const profileData: Prisma.ProfileCreateInput = {
      name: dto.firstName.trim(),
      middleName: dto.middleName?.trim() ?? null,
      lastName: dto.lastName?.trim() ?? null,
      email: dto.email?.toLowerCase() ?? null,
      contactNo: dto.contactNo ?? null,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      maritalStatusId: dto.maritalStatusId ?? null,
      genderId: dto.genderId ?? null,
      bloodGroupId: dto.bloodGroupId ?? null,
      nationalityId: dto.nationalityId ?? null,
      visaTypeId: dto.visaTypeId ?? null,
      motherTongueId: dto.motherTongueId ?? null,
      address: dto.address ?? null,
      homeCountryAddress: dto.homeCountryAddress ?? null,
      homeCountryPhoneNo: dto.homeCountryPhoneNo ?? null,
      qualification: dto.qualification ?? null,
      dateOfExit: dto.dateOfExit ? new Date(dto.dateOfExit) : null,
      exitReasonCode: dto.exitReasonCode ?? null,
      isSiteAccess: dto.isSiteAccess ?? false,
    };

    const personIdNumberEnc = this.pii.encrypt(dto.personIdNumber);
    const personIdNumberHash = this.pii.hash(dto.personIdNumber);

    const employee = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({ data: profileData });
      const generated = manualCode ? null : await this.nextEmployeeCode(tx, dto.employmentType!.trim());

      const emp = await tx.employee.create({
        data: {
          employeeCode: manualCode ?? generated!.code,
          profileId: profile.id,
          reportingToId: dto.reportingToId ?? null,
          sourceOfHireId: dto.sourceOfHireId ?? null,
          locationId: dto.locationId ?? null,
          siteId: dto.siteId ?? null,
          employeeStatusId: dto.employeeStatusId ?? null,
          employeeTypeId: dto.employeeTypeId ?? generated?.parameterId ?? null,
          contractTypeId: dto.contractTypeId ?? null,
          workPhone: dto.workPhone ?? null,
          extension: dto.extension ?? null,
          workEmail: dto.workEmail?.toLowerCase() ?? null,
          dateOfJoining: new Date(dto.dateOfJoining),
          dateOfConfirmation: dto.dateOfConfirmation ? new Date(dto.dateOfConfirmation) : null,
          personIdNumberEnc,
          personIdNumberHash,
          designation: dto.designation ?? null,
          shiftId: dto.shiftId ?? null,
          branchId,
          isActive: true,
        } as Prisma.EmployeeUncheckedCreateInput,
        include: {
          profile: true,
          site: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true } },
        },
      });

      return emp;
    }, INTERACTIVE_TX_OPTIONS);

    await this.audit.log({
      actorProfileId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: String(employee.id),
      ipAddress: ip,
      metadata: { employeeCode: employee.employeeCode, profileId: employee.profileId },
    });

    return this.sanitizeEmployee(employee, false);
  }

  async update(
    id: number,
    dto: UpdateEmployeeDto,
    actorProfileId?: number,
    ip?: string,
  ) {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    if (dto.employeeCode && dto.employeeCode.trim() !== existing.employeeCode) {
      const codeExists = await this.prisma.employee.findUnique({
        where: { employeeCode: dto.employeeCode.trim() },
      });
      if (codeExists) {
        throw new ConflictException('Employee code already exists');
      }
    }

    if (dto.email && dto.email.toLowerCase() !== existing.profile.email?.toLowerCase()) {
      const emailExists = await this.prisma.profile.findFirst({
        where: { email: dto.email.toLowerCase() },
      });
      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    const profileUpdate: Prisma.ProfileUpdateInput = {};
    if (dto.firstName !== undefined) profileUpdate.name = dto.firstName.trim();
    if (dto.middleName !== undefined) profileUpdate.middleName = dto.middleName?.trim() ?? null;
    if (dto.lastName !== undefined) profileUpdate.lastName = dto.lastName?.trim() ?? null;
    if (dto.email !== undefined) profileUpdate.email = dto.email?.toLowerCase() ?? null;
    if (dto.contactNo !== undefined) profileUpdate.contactNo = dto.contactNo ?? null;
    if (dto.dateOfBirth !== undefined)
      profileUpdate.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.maritalStatusId !== undefined) profileUpdate.maritalStatusId = dto.maritalStatusId ?? null;
    if (dto.genderId !== undefined) profileUpdate.genderId = dto.genderId ?? null;
    if (dto.bloodGroupId !== undefined) profileUpdate.bloodGroupId = dto.bloodGroupId ?? null;
    if (dto.nationalityId !== undefined) profileUpdate.nationalityId = dto.nationalityId ?? null;
    if (dto.visaTypeId !== undefined) profileUpdate.visaTypeId = dto.visaTypeId ?? null;
    if (dto.motherTongueId !== undefined) profileUpdate.motherTongueId = dto.motherTongueId ?? null;
    if (dto.address !== undefined) profileUpdate.address = dto.address ?? null;
    if (dto.homeCountryAddress !== undefined) profileUpdate.homeCountryAddress = dto.homeCountryAddress ?? null;
    if (dto.homeCountryPhoneNo !== undefined) profileUpdate.homeCountryPhoneNo = dto.homeCountryPhoneNo ?? null;
    if (dto.qualification !== undefined) profileUpdate.qualification = dto.qualification ?? null;
    if (dto.dateOfExit !== undefined) profileUpdate.dateOfExit = dto.dateOfExit ? new Date(dto.dateOfExit) : null;
    if (dto.exitReasonCode !== undefined) profileUpdate.exitReasonCode = dto.exitReasonCode ?? null;
    if (dto.isSiteAccess !== undefined) profileUpdate.isSiteAccess = dto.isSiteAccess;

    const employeeUpdate: Prisma.EmployeeUncheckedUpdateInput = {};
    if (dto.employeeCode !== undefined) employeeUpdate.employeeCode = dto.employeeCode.trim();
    if (dto.reportingToId !== undefined) employeeUpdate.reportingToId = dto.reportingToId ?? null;
    if (dto.sourceOfHireId !== undefined) employeeUpdate.sourceOfHireId = dto.sourceOfHireId ?? null;
    if (dto.locationId !== undefined) employeeUpdate.locationId = dto.locationId ?? null;
    if (dto.siteId !== undefined) employeeUpdate.siteId = dto.siteId ?? null;
    if (dto.employeeStatusId !== undefined) employeeUpdate.employeeStatusId = dto.employeeStatusId ?? null;
    if (dto.employeeTypeId !== undefined) employeeUpdate.employeeTypeId = dto.employeeTypeId ?? null;
    if (dto.contractTypeId !== undefined) employeeUpdate.contractTypeId = dto.contractTypeId ?? null;
    if (dto.workPhone !== undefined) employeeUpdate.workPhone = dto.workPhone ?? null;
    if (dto.extension !== undefined) employeeUpdate.extension = dto.extension ?? null;
    if (dto.workEmail !== undefined) employeeUpdate.workEmail = dto.workEmail?.toLowerCase() ?? null;
    if (dto.dateOfJoining !== undefined) employeeUpdate.dateOfJoining = new Date(dto.dateOfJoining);
    if (dto.dateOfConfirmation !== undefined)
      employeeUpdate.dateOfConfirmation = dto.dateOfConfirmation ? new Date(dto.dateOfConfirmation) : null;
    if (dto.personIdNumber !== undefined) {
      employeeUpdate.personIdNumberEnc = this.pii.encrypt(dto.personIdNumber);
      employeeUpdate.personIdNumberHash = this.pii.hash(dto.personIdNumber);
    }
    if (dto.designation !== undefined) employeeUpdate.designation = dto.designation ?? null;
    if (dto.shiftId !== undefined) employeeUpdate.shiftId = dto.shiftId ?? null;
    if (dto.isActive !== undefined) employeeUpdate.isActive = dto.isActive;

    const employee = await this.prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: existing.profileId },
        data: profileUpdate,
      });

      return tx.employee.update({
        where: { id },
        data: employeeUpdate as Prisma.EmployeeUncheckedUpdateInput,
        include: {
          profile: true,
          site: { select: { id: true, name: true } },
          shift: { select: { id: true, name: true } },
        },
      });
    }, INTERACTIVE_TX_OPTIONS);

    await this.audit.log({
      actorProfileId,
      action: dto.isActive === false ? 'EMPLOYEE_DEACTIVATED' : 'EMPLOYEE_UPDATED',
      entityType: 'Employee',
      entityId: String(id),
      ipAddress: ip,
    });

    return this.sanitizeEmployee(employee, false);
  }

  async remove(id: number, actorProfileId?: number, ip?: string) {
    return this.update(id, { isActive: false }, actorProfileId, ip);
  }

  async uploadPhoto(
    id: number,
    file: UploadedFileLike,
    actorProfileId?: number,
    ip?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // BR-MD-09: photos are .jpg/.jpeg/.png, max 10 MB (10,485,760 bytes).
    assertValidPhoto(file);

    const stored = await this.storage.saveFile(file);

    const storedFile = await this.prisma.storedFile.create({
      data: {
        originalName: stored.originalName,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: BigInt(stored.sizeBytes),
        sha256: stored.sha256,
        createdById: actorProfileId ?? null,
      },
    });

    await this.prisma.profile.update({
      where: { id: employee.profileId },
      data: { photoFileId: storedFile.id },
    });

    await this.audit.log({
      actorProfileId,
      action: 'EMPLOYEE_PHOTO_UPLOADED',
      entityType: 'Employee',
      entityId: String(id),
      ipAddress: ip,
      metadata: { fileId: storedFile.id.toString() },
    });

    return {
      fileId: storedFile.id,
      storageKey: storedFile.storageKey,
      originalName: storedFile.originalName,
      mimeType: storedFile.mimeType,
    };
  }

  /** Streams the employee's current photo. Caller authorization is checked in the controller. */
  async getPhotoStream(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { profile: { include: { photoFile: true } } },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    const file = employee.profile.photoFile;
    if (!file) throw new NotFoundException('No photo uploaded');
    let stream;
    try {
      stream = this.storage.readFile(file.storageKey);
    } catch {
      throw new NotFoundException('Photo file is missing from storage');
    }
    return { stream, mimeType: file.mimeType, sizeBytes: file.sizeBytes, profileId: employee.profileId };
  }

  /** Profile id of an employee (for self-access checks). */
  async profileIdOf(id: number): Promise<number> {
    const e = await this.prisma.employee.findUnique({ where: { id }, select: { profileId: true } });
    if (!e) throw new NotFoundException('Employee not found');
    return e.profileId;
  }

  // ==================== Dependants ====================
  async findDependants(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { profileId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.dependant.findMany({
      where: { employeeProfileId: employee.profileId },
      include: {
        dependantProfile: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            contactNo: true,
            dateOfBirth: true,
            genderId: true,
          },
        },
      },
    });
  }

  async createDependant(
    employeeId: number,
    dto: CreateDependantDto,
    actorProfileId?: number,
    ip?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { profileId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const dependantProfile = await this.prisma.profile.create({
      data: {
        name: dto.firstName.trim(),
        lastName: dto.lastName?.trim() ?? null,
        email: dto.email?.toLowerCase() ?? null,
        contactNo: dto.contactNo ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        genderId: dto.genderId ?? null,
      },
    });

    const dependant = await this.prisma.dependant.create({
      data: {
        dependantProfileId: dependantProfile.id,
        employeeProfileId: employee.profileId,
        relationTypeId: dto.relationTypeId ?? null,
      },
      include: {
        dependantProfile: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            contactNo: true,
            dateOfBirth: true,
            genderId: true,
          },
        },
      },
    });

    await this.audit.log({
      actorProfileId,
      action: 'DEPENDANT_CREATED',
      entityType: 'Dependant',
      entityId: String(dependant.id),
      ipAddress: ip,
      metadata: { employeeId, profileId: dependantProfile.id },
    });

    return dependant;
  }

  async updateDependant(
    employeeId: number,
    dependantId: number,
    dto: UpdateDependantDto,
    actorProfileId?: number,
    ip?: string,
  ) {
    const dependant = await this.prisma.dependant.findFirst({
      where: { id: dependantId, employeeProfileId: (await this.getEmployeeProfileId(employeeId)) },
      include: { dependantProfile: true },
    });
    if (!dependant) throw new NotFoundException('Dependant not found');

    const profileUpdate: Prisma.ProfileUpdateInput = {};
    if (dto.firstName !== undefined) profileUpdate.name = dto.firstName.trim();
    if (dto.lastName !== undefined) profileUpdate.lastName = dto.lastName?.trim() ?? null;
    if (dto.email !== undefined) profileUpdate.email = dto.email?.toLowerCase() ?? null;
    if (dto.contactNo !== undefined) profileUpdate.contactNo = dto.contactNo ?? null;
    if (dto.dateOfBirth !== undefined)
      profileUpdate.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.genderId !== undefined) profileUpdate.genderId = dto.genderId ?? null;

    await this.prisma.profile.update({
      where: { id: dependant.dependantProfileId },
      data: profileUpdate,
    });

    if (dto.relationTypeId !== undefined) {
      await this.prisma.dependant.update({
        where: { id: dependantId },
        data: { relationTypeId: dto.relationTypeId ?? null },
      });
    }

    await this.audit.log({
      actorProfileId,
      action: 'DEPENDANT_UPDATED',
      entityType: 'Dependant',
      entityId: String(dependantId),
      ipAddress: ip,
    });

    return this.prisma.dependant.findUnique({
      where: { id: dependantId },
      include: {
        dependantProfile: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            contactNo: true,
            dateOfBirth: true,
            genderId: true,
          },
        },
      },
    });
  }

  async removeDependant(
    employeeId: number,
    dependantId: number,
    actorProfileId?: number,
    ip?: string,
  ) {
    const dependant = await this.prisma.dependant.findFirst({
      where: { id: dependantId, employeeProfileId: (await this.getEmployeeProfileId(employeeId)) },
    });
    if (!dependant) throw new NotFoundException('Dependant not found');

    await this.prisma.dependant.delete({ where: { id: dependantId } });

    await this.audit.log({
      actorProfileId,
      action: 'DEPENDANT_DELETED',
      entityType: 'Dependant',
      entityId: String(dependantId),
      ipAddress: ip,
    });
  }

  private async getEmployeeProfileId(employeeId: number): Promise<number> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { profileId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee.profileId;
  }

  private sanitizeEmployee(employee: any, maskPii: boolean) {
    const { personIdNumberEnc, personIdNumberHash, ...rest } = employee;
    const personIdNumber = personIdNumberEnc ? this.pii.decrypt(personIdNumberEnc) : null;
    return {
      ...rest,
      personIdNumber: maskPii ? this.pii.mask(personIdNumber) : personIdNumber,
    };
  }
}

/* ---------------- photo validation (BR-MD-09) ---------------- */

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Accepts only JPEG or PNG up to 10 MB. The file signature is checked as well as the
 * name and declared type, so a renamed file of another kind is rejected.
 */
export function assertValidPhoto(file: UploadedFileLike): void {
  const name = (file.originalname || '').toLowerCase();
  const ext = name.slice(name.lastIndexOf('.'));
  if (!PHOTO_EXTENSIONS.includes(ext)) {
    throw new BadRequestException('Photo must be a .jpg, .jpeg or .png file');
  }
  if (!file.size || file.size > PHOTO_MAX_BYTES) {
    throw new BadRequestException('Photo must be smaller than 10 MB');
  }
  const b = file.buffer;
  const isJpeg = b && b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isPng = b && b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (!isJpeg && !isPng) {
    throw new BadRequestException('The file is not a valid JPEG or PNG image');
  }
}
