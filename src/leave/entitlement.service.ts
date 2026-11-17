import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  EntitlementInput, EntitlementResult, PolicySubject, ProrationMethod, RoundingMode, ScopedPolicy, ServiceSlab, SlabTiming, TieRule,
  addDaysIso, addMonthsIso, entitlementForYear, pickPolicy, roundDays,
} from './entitlement-rules';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const num = (d: Prisma.Decimal | number | null) => (d === null ? null : Number(d));

export interface ResolvedRule {
  policyId: number;
  policyName: string;
  layer: string;
  creditMethod: string;
  input: Omit<EntitlementInput, 'joinDate' | 'serviceStart' | 'yearStart'>;
}

export interface EmployeeFacts {
  id: number;
  joinDate: string;
  branchId: number | null;
  siteId: number | null;
  employeeTypeId: number | null;
  countryCode: string | null;
  /** Date of confirmation (on payroll); null while on probation or when never set. */
  confirmedOn: string | null;
}

/** Works out entitlement from the leave policies. It never decides anything itself: all numbers come from policy rows. */
@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  /** Facts about employees that policy scope looks at. Country comes from the Organization section of the profile. */
  async facts(employeeIds?: number[]): Promise<EmployeeFacts[]> {
    const emps = await this.prisma.employee.findMany({
      where: { isActive: true, ...(employeeIds ? { id: { in: employeeIds } } : {}) },
      select: { id: true, dateOfJoining: true, dateOfConfirmation: true, branchId: true, siteId: true, employeeTypeId: true },
    });
    const sections = await this.prisma.employeeProfileSection.findMany({ where: { sectionKey: 'organization', employeeId: { in: emps.map((e) => e.id) } }, select: { employeeId: true, data: true } });
    const org = new Map(sections.map((s) => [s.employeeId, (s.data ?? {}) as { legalEntityCountry?: unknown; employmentType?: unknown }]));
    // The profile stores the employment type by name; policies point at the Employee Type parameter.
    const typeIds = new Map((await this.prisma.parameter.findMany({ where: { parameterType: { name: 'Employee Type' } }, select: { id: true, text: true } })).map((p) => [p.text, p.id]));
    return emps.map((e) => {
      const o = org.get(e.id);
      const c = o?.legalEntityCountry;
      const t = typeof o?.employmentType === 'string' ? typeIds.get(o.employmentType) : undefined;
      return { id: e.id, joinDate: iso(e.dateOfJoining), branchId: e.branchId, siteId: e.siteId, employeeTypeId: e.employeeTypeId ?? t ?? null, countryCode: typeof c === 'string' && c ? c : null, confirmedOn: e.dateOfConfirmation ? iso(e.dateOfConfirmation) : null };
    });
  }

  /** Active policies that have a rule for this leave type, loaded once for a batch. */
  async load(leaveTypeId: number) {
    const rows = await this.prisma.leavePolicy.findMany({ where: { isActive: true, rules: { some: { leaveTypeId } } }, include: { rules: { where: { leaveTypeId } } } });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      layer: p.layer,
      priority: p.priority,
      effectiveFrom: iso(p.effectiveFrom),
      effectiveTo: p.effectiveTo ? iso(p.effectiveTo) : null,
      scope: { countryCode: p.countryCode, branchId: p.branchId, employmentTypeId: p.employeeTypeId, employeeId: p.employeeId },
      rule: p.rules[0],
    }));
  }

  /** The rule in force for this person on this date: the best statutory policy and the best company policy. */
  resolve(policies: Awaited<ReturnType<EntitlementService['load']>>, who: EmployeeFacts, date: string): ResolvedRule[] {
    const subject: PolicySubject = { employeeId: who.id, countryCode: who.countryCode, branchId: who.branchId, employmentTypeId: who.employeeTypeId };
    const out: ResolvedRule[] = [];
    for (const layer of ['STATUTORY', 'COMPANY']) {
      const hit = pickPolicy(policies.filter((p) => p.layer === layer) as (ScopedPolicy & (typeof policies)[number])[], subject, date);
      if (!hit) continue;
      const r = hit.rule;
      out.push({
        policyId: hit.id,
        policyName: hit.name,
        layer,
        creditMethod: r.creditMethod,
        input: {
          annualDays: Number(r.annualDays),
          slabs: (r.slabs as unknown as ServiceSlab[]) ?? [],
          slabTiming: r.slabTiming as SlabTiming,
          method: r.proration as ProrationMethod,
          cutoffDay: r.cutoffDay ?? undefined,
          rounding: r.rounding as RoundingMode,
          tie: r.tieRule as TieRule,
          minDays: num(r.minDays),
          maxDays: num(r.maxDays),
        },
      });
    }
    return out;
  }

  /**
   * Entitlement for one leave year. When both a statutory and a company policy apply the employee gets the larger,
   * and the credit method of that winning policy is used.
   */
  compute(rules: ResolvedRule[], who: EmployeeFacts, yearStart: string): { winner: ResolvedRule; result: EntitlementResult; others: { rule: ResolvedRule; result: EntitlementResult }[] } | null {
    if (!rules.length) return null;
    const scored = rules.map((rule) => ({ rule, result: entitlementForYear({ ...rule.input, yearStart, serviceStart: who.joinDate, joinDate: who.joinDate }) }));
    scored.sort((a, b) => b.result.quantity - a.result.quantity);
    return { winner: scored[0].rule, result: scored[0].result, others: scored.slice(1) };
  }

  /**
   * Credits due for each month of the year up to `month` (0-based index from the year start). Each month's credit is the
   * change in the rounded running total, so the year always adds up to the rounded entitlement.
   */
  monthlySchedule(result: EntitlementResult, rounding: RoundingMode, tie: TieRule, upTo: number): number[] {
    const out: number[] = [];
    let before = 0;
    let running = 0;
    for (let m = 0; m <= upTo && m < result.lines.length; m += 1) {
      running += result.lines[m].days;
      const target = m === 11 ? result.quantity : roundDays(running, rounding, tie);
      out.push(Math.round((target - before) * 100) / 100);
      before = target;
    }
    return out;
  }

  /** Explain a figure without saving anything. */
  async preview(employeeId: number, leaveTypeId: number, yearStart: string) {
    const [who] = await this.facts([employeeId]);
    if (!who) return null;
    const rules = this.resolve(await this.load(leaveTypeId), who, yearStart);
    const calc = this.compute(rules, who, yearStart);
    return {
      employee: who,
      yearStart,
      yearEnd: addDaysIso(addMonthsIso(yearStart, 12), -1),
      confirmedOn: who.confirmedOn,
      applied: rules.map((r) => ({ policyId: r.policyId, policy: r.policyName, layer: r.layer, creditMethod: r.creditMethod })),
      winner: calc ? { policyId: calc.winner.policyId, policy: calc.winner.policyName, layer: calc.winner.layer, creditMethod: calc.winner.creditMethod } : null,
      quantity: calc?.result.quantity ?? null,
      raw: calc?.result.raw ?? null,
      lines: calc?.result.lines ?? [],
    };
  }

  /** Keep the working that produced a credit, so it can be explained later. */
  async record(employeeId: number, leaveTypeId: number, yearStart: string, rule: ResolvedRule, who: EmployeeFacts, result: EntitlementResult) {
    await this.prisma.leaveEntitlementRun.upsert({
      where: { employeeId_leaveTypeId_yearStart_policyId: { employeeId, leaveTypeId, yearStart: new Date(`${yearStart}T00:00:00Z`), policyId: rule.policyId } },
      create: { employeeId, leaveTypeId, policyId: rule.policyId, yearStart: new Date(`${yearStart}T00:00:00Z`), input: { ...rule.input, serviceStart: who.joinDate, joinDate: who.joinDate } as unknown as Prisma.InputJsonValue, rawDays: result.raw, quantity: result.quantity, lines: result.lines as unknown as Prisma.InputJsonValue },
      update: { input: { ...rule.input, serviceStart: who.joinDate, joinDate: who.joinDate } as unknown as Prisma.InputJsonValue, rawDays: result.raw, quantity: result.quantity, lines: result.lines as unknown as Prisma.InputJsonValue },
    });
  }
}
