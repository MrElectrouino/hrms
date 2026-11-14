import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { SessionService } from '../auth/session.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

export interface PaginatedUsers {
  items: any[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

const userSelect = {
  id: true,
  username: true,
  userTypeId: true,
  profileId: true,
  isActive: true,
  mustChangePassword: true,
  allBranches: true,
  branches: { select: { branchId: true } },
  createdAt: true,
  updatedAt: true,
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
  userType: { select: { id: true, name: true } },
  activity: {
    select: {
      isLocked: true,
      lockedUntil: true,
      failedLoginAttempts: true,
      lastLoginAt: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
  ) {
    this.bcryptRounds = this.config.get<number>('app.security.bcryptRounds', 12);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedUsers> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = [25, 50, 100].includes(query.pageSize ?? 25) ? query.pageSize ?? 25 : 25;
    const skip = (page - 1) * pageSize;

    const allowedSortFields = ['username', 'createdAt', 'userTypeId', 'isActive'];
    const sortBy =
      query.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'username';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const where: Prisma.UserWhereInput = {};
    if (query.userTypeId !== undefined) where.userTypeId = query.userTypeId;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      const term = query.search.trim();
      where.profile = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [totalItems, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        select: userSelect,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
        totalItems,
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actor: CurrentUserPayload, ip?: string) {
    this.assertMayAssignType(actor, dto.userTypeId);
    await this.assertUserTypeExists(dto.userTypeId);

    const username = dto.username.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException('Username already exists');
    }

    let profileId = dto.profileId;
    if (profileId) {
      const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
      if (!profile) throw new NotFoundException('Profile not found');
      if (await this.prisma.user.findUnique({ where: { profileId } })) {
        throw new ConflictException('A user already exists for this profile');
      }
    } else {
      const profile = await this.prisma.profile.create({
        data: { name: username, isSiteAccess: true },
      });
      profileId = profile.id;
    }

    const branchChange = await this.checkBranchAccess(dto, actor, true);
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          username,
          passwordHash,
          userTypeId: dto.userTypeId,
          profileId,
          // An admin-set password is temporary: the user must choose their own at first sign-in.
          mustChangePassword: true,
          isActive: true,
          ...(branchChange && {
            allBranches: branchChange.allBranches,
            branches: { create: branchChange.branchIds.map((branchId) => ({ branchId })) },
          }),
        },
        select: userSelect,
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Username or profile already in use');
      }
      throw error;
    }

    await this.audit.log({
      actorProfileId: actor.profileId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: String(user.id),
      ipAddress: ip,
      metadata: { userTypeId: dto.userTypeId, profileId },
    });

    return user;
  }

  async update(id: number, dto: UpdateUserDto, actor: CurrentUserPayload, ip?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    const isSelf = target.id === actor.userId;
    const changesType = dto.userTypeId !== undefined && dto.userTypeId !== target.userTypeId;
    const deactivates = dto.isActive === false && target.isActive;

    if (changesType) {
      await this.assertUserTypeExists(dto.userTypeId!);
      this.assertMayAssignType(actor, dto.userTypeId!);
      if (target.userTypeId === UserType.SystemAdmin) this.assertMayTouchAdmin(actor);
    }
    if (deactivates && target.userTypeId === UserType.SystemAdmin) {
      this.assertMayTouchAdmin(actor);
    }
    if (isSelf && (deactivates || changesType)) {
      throw new ForbiddenException('You cannot deactivate or change the role of your own account');
    }

    const losesAdminRole =
      target.userTypeId === UserType.SystemAdmin &&
      target.isActive &&
      ((changesType && dto.userTypeId !== UserType.SystemAdmin) || deactivates);
    if (losesAdminRole) {
      await this.assertAnotherActiveAdminExists(target.id);
    }

    const branchChange = await this.checkBranchAccess(dto, actor, target.allBranches);
    const data: Prisma.UserUncheckedUpdateInput = {};
    if (branchChange) data.allBranches = branchChange.allBranches;
    if (changesType) data.userTypeId = dto.userTypeId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const [, , updated] = await this.prisma.$transaction([
      this.prisma.userBranch.deleteMany({ where: { userId: id, ...(branchChange ? {} : { userId: -1 }) } }),
      this.prisma.userBranch.createMany({ data: (branchChange?.branchIds ?? []).map((branchId) => ({ userId: id, branchId })) }),
      this.prisma.user.update({ where: { id }, data, select: userSelect }),
      ...(deactivates
        ? [
            this.prisma.session.updateMany({
              where: { userId: id, revokedAt: null },
              data: { revokedAt: new Date(), revokedReason: 'user_deactivated' },
            }),
          ]
        : []),
    ]);

    await this.audit.log({
      actorProfileId: actor.profileId,
      action: deactivates ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      entityType: 'User',
      entityId: String(id),
      ipAddress: ip,
      metadata: {
        ...(changesType ? { userTypeId: { from: target.userTypeId, to: dto.userTypeId } } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(branchChange ? { allBranches: branchChange.allBranches, branchIds: branchChange.branchIds } : {}),
      },
    });

    return updated;
  }

  async remove(id: number, actor: CurrentUserPayload, ip?: string) {
    return this.update(id, { isActive: false }, actor, ip);
  }

  /**
   * Admin sets a temporary password. The user must change it at next sign-in,
   * and every existing session is signed out.
   */
  async resetPassword(id: number, newPassword: string, actor: CurrentUserPayload, ip?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === actor.userId) {
      throw new ForbiddenException('Use change-password to change your own password');
    }
    if (target.userTypeId === UserType.SystemAdmin) this.assertMayTouchAdmin(actor);

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.userActivity.upsert({
        where: { userId: id },
        create: { userId: id, passwordChangedAt: now, isPasswordReset: true },
        update: {
          passwordChangedAt: now,
          isPasswordReset: true,
          failedLoginAttempts: 0,
          failedLoginAttemptAt: null,
          isLocked: false,
          lockedUntil: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'admin_password_reset' },
      }),
    ]);

    await this.audit.log({
      actorProfileId: actor.profileId,
      action: 'ADMIN_PASSWORD_RESET',
      entityType: 'User',
      entityId: String(id),
      ipAddress: ip,
    });
  }

  /** Clears a lock (legacy had no unlock path; auto-unlock also applies after lockedUntil). */
  async unlock(id: number, actor: CurrentUserPayload, ip?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.userActivity.upsert({
      where: { userId: id },
      create: { userId: id, isLocked: false, failedLoginAttempts: 0 },
      update: { isLocked: false, lockedUntil: null, failedLoginAttempts: 0, failedLoginAttemptAt: null },
    });

    await this.audit.log({
      actorProfileId: actor.profileId,
      action: 'USER_UNLOCKED',
      entityType: 'User',
      entityId: String(id),
      ipAddress: ip,
    });
  }

  async revokeSessions(id: number, actor: CurrentUserPayload, ip?: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');
    const count = await this.sessions.revokeAll(id, 'admin_revoked');

    await this.audit.log({
      actorProfileId: actor.profileId,
      action: 'USER_SESSIONS_REVOKED',
      entityType: 'User',
      entityId: String(id),
      ipAddress: ip,
      metadata: { revoked: count },
    });
    return { revoked: count };
  }

  // ---------------------------------------------------------------------------

  /** Only a System Administrator may create or grant the System Administrator role. */
  private assertMayAssignType(actor: CurrentUserPayload, userTypeId: number) {
    if (userTypeId === UserType.SystemAdmin) this.assertMayTouchAdmin(actor);
  }

  private assertMayTouchAdmin(actor: CurrentUserPayload) {
    if (actor.userTypeId !== UserType.SystemAdmin) {
      throw new ForbiddenException('Only a System Administrator can manage System Administrator accounts');
    }
  }

  /** Validates a branch-access change; only System Admins may grant branch access. */
  private async checkBranchAccess(
    dto: { allBranches?: boolean; branchIds?: number[] },
    actor: CurrentUserPayload,
    currentAll: boolean,
  ): Promise<{ allBranches: boolean; branchIds: number[] } | null> {
    if (dto.allBranches === undefined && dto.branchIds === undefined) return null;
    if (actor.userTypeId !== UserType.SystemAdmin) {
      throw new ForbiddenException('Only a System Admin can change branch access');
    }
    const allBranches = dto.allBranches ?? currentAll;
    const branchIds = allBranches ? [] : dto.branchIds ?? [];
    if (!allBranches) {
      if (branchIds.length === 0) throw new BadRequestException('Choose at least one branch, or allow all branches');
      const found = await this.prisma.parameter.count({ where: { id: { in: branchIds }, isVisible: true, parameterType: { name: 'Branch' } } });
      if (found !== branchIds.length) throw new BadRequestException('One or more branches do not exist or are inactive');
    }
    return { allBranches, branchIds };
  }

  private async assertUserTypeExists(userTypeId: number) {
    const exists = await this.prisma.userType.findUnique({ where: { id: userTypeId } });
    if (!exists) throw new BadRequestException('Unknown user type');
  }

  private async assertAnotherActiveAdminExists(excludeUserId: number) {
    const others = await this.prisma.user.count({
      where: {
        id: { not: excludeUserId },
        userTypeId: UserType.SystemAdmin,
        isActive: true,
      },
    });
    if (others === 0) {
      throw new ConflictException('At least one active System Administrator is required');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }
}
