import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { parseIsoDate, toIsoDate } from '../attendance-setup/attendance-logic';
import { AttendanceService } from './attendance.service';

const HR_TYPES: number[] = [UserType.SystemAdmin, UserType.HRAdmin];
const MAX_DAYS_BACK = 31;

export interface RegularizationInput {
  date: string;
  inTime?: string;
  outTime?: string;
  reason: string;
}

/** An employee asks for a day to be corrected; their manager or HR approves or rejects. */
@Injectable()
export class RegularizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly attendance: AttendanceService,
  ) {}

  private async myEmployeeId(user: CurrentUserPayload) {
    const e = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true, isActive: true } });
    if (!e || !e.isActive) throw new ForbiddenException('Your account is not linked to an active employee record');
    return e.id;
  }

  private present(r: { id: number; employeeId: number; date: Date; requestedIn: string | null; requestedOut: string | null; reason: string; status: string; decidedAt: Date | null; decisionNote: string | null; createdAt: Date; employee?: { employeeCode: string; profile: { name: string; lastName: string | null } } }) {
    return {
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee ? [r.employee.profile.name, r.employee.profile.lastName].filter(Boolean).join(' ') : undefined,
      employeeCode: r.employee?.employeeCode,
      date: toIsoDate(r.date),
      requestedIn: r.requestedIn,
      requestedOut: r.requestedOut,
      reason: r.reason,
      status: r.status,
      decidedAt: r.decidedAt,
      decisionNote: r.decisionNote,
      createdAt: r.createdAt,
    };
  }

  async request(user: CurrentUserPayload, dto: RegularizationInput) {
    const employeeId = await this.myEmployeeId(user);
    const date = parseIsoDate(dto.date);
    if (!date) throw new BadRequestException('Date must be a real date (YYYY-MM-DD)');
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    if (date > today) throw new BadRequestException('You cannot ask to correct a future day');
    if ((today.getTime() - date.getTime()) / 86_400_000 > MAX_DAYS_BACK) throw new BadRequestException(`Requests can go back ${MAX_DAYS_BACK} days. Ask HR for older days.`);
    if (!dto.inTime && !dto.outTime) throw new BadRequestException('Give the IN time, the OUT time, or both');
    if (dto.inTime && dto.outTime && dto.outTime < dto.inTime) throw new BadRequestException('OUT time cannot be before IN time');
    if (await this.prisma.attendanceRegularization.count({ where: { employeeId, date, status: 'PENDING' } })) throw new ConflictException('You already have a pending request for that day');
    const created = await this.prisma.attendanceRegularization.create({ data: { employeeId, date, requestedIn: dto.inTime ?? null, requestedOut: dto.outTime ?? null, reason: dto.reason.trim() } });
    await this.audit.log({ actorProfileId: user.profileId, action: 'REGULARIZATION_REQUESTED', entityType: 'AttendanceRegularization', entityId: String(created.id), metadata: { date: dto.date } });
    return this.present(created);
  }

  async mine(user: CurrentUserPayload) {
    const employeeId = await this.myEmployeeId(user);
    const rows = await this.prisma.attendanceRegularization.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((r) => this.present(r));
  }

  async cancel(user: CurrentUserPayload, id: number) {
    const employeeId = await this.myEmployeeId(user);
    const res = await this.prisma.attendanceRegularization.updateMany({ where: { id, employeeId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (!res.count) throw new NotFoundException('No pending request to cancel');
  }

  /** Requests the caller can decide: their direct reports (manager) or everyone in their branches (HR). */
  async team(user: CurrentUserPayload, status?: string) {
    const where: Record<string, unknown> = status ? { status } : {};
    if (HR_TYPES.includes(user.userTypeId)) {
      if (user.activeBranchIds) where.employee = { branchId: { in: user.activeBranchIds } };
    } else {
      const me = await this.myEmployeeId(user);
      where.employee = { reportingToId: me };
    }
    const rows = await this.prisma.attendanceRegularization.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: { employee: { select: { employeeCode: true, profile: { select: { name: true, lastName: true } } } } },
    });
    return rows.map((r) => this.present(r));
  }

  async decide(user: CurrentUserPayload, id: number, approve: boolean, note: string | undefined, ip?: string) {
    const r = await this.prisma.attendanceRegularization.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'PENDING') throw new ConflictException('This request has already been decided');
    const dateStr = toIsoDate(r.date);

    if (approve) {
      // Applying the corrected times goes through the same rules and audit as a manual edit.
      await this.attendance.edit(user, r.employeeId, dateStr, { inTime: r.requestedIn ?? undefined, outTime: r.requestedOut ?? undefined, remarks: `Regularization: ${r.reason}`.slice(0, 150) }, ip, { force: true });
    } else {
      // Same permission as editing: HR, or the employee's own manager.
      const target = await this.prisma.employee.findUnique({ where: { id: r.employeeId }, select: { reportingToId: true } });
      const me = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } });
      if (!HR_TYPES.includes(user.userTypeId) && (!me || target?.reportingToId !== me.id)) throw new ForbiddenException('You can only decide requests from your own team');
    }
    await this.prisma.attendanceRegularization.update({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', decidedById: user.profileId, decidedAt: new Date(), decisionNote: note?.trim() || null } });
    await this.audit.log({ actorProfileId: user.profileId, action: approve ? 'REGULARIZATION_APPROVED' : 'REGULARIZATION_REJECTED', entityType: 'AttendanceRegularization', entityId: String(id), ipAddress: ip });
  }
}
