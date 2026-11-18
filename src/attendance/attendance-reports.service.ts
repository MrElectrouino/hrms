import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { parseIsoDate, toIsoDate } from '../attendance-setup/attendance-logic';
import { isAwaitingApproval } from './attendance-rules';

const HR_TYPES: number[] = [UserType.SystemAdmin, UserType.HRAdmin];
const MAX_RANGE_DAYS = 92;
const MAX_ROWS = 20000;

export type ExceptionKind = 'late' | 'short' | 'overtime' | 'missing-punch' | 'absent' | 'pending';

/** Attendance reports. HR sees their branches, a manager sees their team. */
@Injectable()
export class AttendanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async scope(user: CurrentUserPayload): Promise<Prisma.AttendanceWhereInput> {
    if (HR_TYPES.includes(user.userTypeId)) return user.activeBranchIds ? { employee: { branchId: { in: user.activeBranchIds } } } : {};
    const me = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } });
    return { employee: { reportingToId: me?.id ?? -1 } };
  }

  private range(fromStr: string, toStr: string) {
    const from = parseIsoDate(fromStr);
    const to = parseIsoDate(toStr);
    if (!from || !to || to < from) throw new BadRequestException('Give a valid from and to date');
    if ((to.getTime() - from.getTime()) / 86_400_000 + 1 > MAX_RANGE_DAYS) throw new BadRequestException(`Ask for at most ${MAX_RANGE_DAYS} days at a time`);
    return { from, to };
  }

  /** One line per employee: days by status, late and short days, worked hours and overtime. */
  async summary(user: CurrentUserPayload, fromStr: string, toStr: string) {
    const { from, to } = this.range(fromStr, toStr);
    const rows = await this.prisma.attendance.findMany({
      where: { date: { gte: from, lte: to }, ...(await this.scope(user)) },
      take: MAX_ROWS,
      select: { employeeId: true, statusCode: true, lateMinutes: true, workedMinutes: true, shortMinutes: true, overtimeMinutes: true, approvedAt: true, policyId: true, employee: { select: { employeeCode: true, profile: { select: { name: true, lastName: true } } } } },
    });
    const approval = await this.approvalByPolicy(rows.map((r) => r.policyId));
    const by = new Map<number, { employeeId: number; employeeCode: string; employeeName: string; days: Record<string, number>; lateDays: number; lateMinutes: number; workedMinutes: number; shortMinutes: number; overtimeMinutes: number; pending: number }>();
    for (const r of rows) {
      const row = by.get(r.employeeId) ?? { employeeId: r.employeeId, employeeCode: r.employee.employeeCode, employeeName: [r.employee.profile.name, r.employee.profile.lastName].filter(Boolean).join(' '), days: {}, lateDays: 0, lateMinutes: 0, workedMinutes: 0, shortMinutes: 0, overtimeMinutes: 0, pending: 0 };
      row.days[r.statusCode] = (row.days[r.statusCode] ?? 0) + 1;
      if (r.lateMinutes > 0) { row.lateDays++; row.lateMinutes += r.lateMinutes; }
      row.workedMinutes += r.workedMinutes ?? 0;
      row.shortMinutes += r.shortMinutes;
      row.overtimeMinutes += r.overtimeMinutes;
      if (isAwaitingApproval(r.approvedAt, r.policyId == null ? undefined : approval.get(r.policyId))) row.pending++;
      by.set(r.employeeId, row);
    }
    const statuses = await this.prisma.attendanceStatus.findMany({ orderBy: { sortOrder: 'asc' }, select: { code: true, name: true, color: true } });
    return { statuses, rows: [...by.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName)), truncated: rows.length >= MAX_ROWS };
  }

  /** The days behind a number: late, short hours, overtime, a missing OUT, absent, or waiting for approval. */
  async exceptions(user: CurrentUserPayload, kind: ExceptionKind, fromStr: string, toStr: string) {
    const { from, to } = this.range(fromStr, toStr);
    const filter: Record<ExceptionKind, Prisma.AttendanceWhereInput> = {
      late: { lateMinutes: { gt: 0 } },
      short: { shortMinutes: { gt: 0 } },
      overtime: { overtimeMinutes: { gt: 0 } },
      'missing-punch': { firstInAt: { not: null }, lastOutAt: null },
      absent: { statusCode: { in: ['ABSENT', 'NOT_FOUND_PRESENT'] } },
      pending: { approvedAt: null },
    };
    if (!filter[kind]) throw new BadRequestException('Unknown report');
    const rows = await this.prisma.attendance.findMany({
      where: { date: { gte: from, lte: to }, ...filter[kind], ...(await this.scope(user)) },
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
      take: 1000,
      include: { status: { select: { name: true, color: true } }, employee: { select: { employeeCode: true, profile: { select: { name: true, lastName: true } } } } },
    });
    const approval = await this.approvalByPolicy(rows.map((r) => r.policyId));
    // "pending" depends on the policy, so it is filtered here rather than in the query.
    const shown = kind === 'pending' ? rows.filter((r) => isAwaitingApproval(r.approvedAt, r.policyId == null ? undefined : approval.get(r.policyId))) : rows;
    return shown.map((r) => ({
      date: toIsoDate(r.date),
      employeeId: r.employeeId,
      employeeCode: r.employee.employeeCode,
      employeeName: [r.employee.profile.name, r.employee.profile.lastName].filter(Boolean).join(' '),
      statusName: r.status.name,
      statusColor: r.status.color,
      firstInAt: r.firstInAt,
      lastOutAt: r.lastOutAt,
      lateMinutes: r.lateMinutes,
      workedMinutes: r.workedMinutes,
      requiredMinutes: r.requiredMinutes,
      shortMinutes: r.shortMinutes,
      overtimeMinutes: r.overtimeMinutes,
      approved: !isAwaitingApproval(r.approvedAt, r.policyId == null ? undefined : approval.get(r.policyId)),
    }));
  }

  /** Whether each policy id asks for approval of its days (see isAwaitingApproval). */
  private async approvalByPolicy(policyIds: Array<number | null>): Promise<Map<number, boolean>> {
    const ids = [...new Set(policyIds.filter((id): id is number => id != null))];
    if (!ids.length) return new Map();
    const policies = await this.prisma.attendancePolicy.findMany({ where: { id: { in: ids } }, select: { id: true, requiresApproval: true } });
    return new Map(policies.map((p) => [p.id, p.requiresApproval]));
  }
}
