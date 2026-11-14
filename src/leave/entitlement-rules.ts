/**
 * Pure rules for how many leave days an employee is entitled to in a leave year.
 * Nothing here knows about a country: every number comes in as configuration.
 * Dates are ISO strings (YYYY-MM-DD) and are handled in UTC.
 */

export type RoundingMode = 'NONE' | 'DOWN' | 'UP' | 'NEAREST' | 'NEAREST_HALF' | 'UP_HALF' | 'DOWN_HALF';
export type TieRule = 'UP' | 'DOWN';
export type ProrationMethod = 'NONE' | 'COMPLETED_MONTHS' | 'STARTED_MONTHS' | 'CUTOFF_DAY' | 'EXACT_DAYS';
/** NEXT_YEAR: the slab at the start of the leave year applies all year. IMMEDIATE: a new slab applies from the month (or day) it is reached. */
export type SlabTiming = 'NEXT_YEAR' | 'IMMEDIATE';

export interface ServiceSlab {
  fromMonths: number;
  /** Exclusive upper bound; null = no upper bound. */
  toMonths: number | null;
  annualDays: number;
}

export interface EntitlementInput {
  /** Annual days when there are no slabs. */
  annualDays: number;
  slabs?: ServiceSlab[];
  slabTiming?: SlabTiming;
  /** Start of the leave year. */
  yearStart: string;
  /** Date service counts from (joining date, payroll date or an override). */
  serviceStart: string;
  /** First day the employee is employed in this year (usually the joining date). */
  joinDate: string;
  /** Last day employed, if they left. */
  exitDate?: string | null;
  method: ProrationMethod;
  /** CUTOFF_DAY: joining on or before this day of the month counts that month. */
  cutoffDay?: number;
  rounding: RoundingMode;
  tie?: TieRule;
  minDays?: number | null;
  maxDays?: number | null;
}

export interface EntitlementResult {
  raw: number;
  quantity: number;
  /** One line per month or per day-block, so the figure can be explained. */
  lines: { from: string; to: string; annualDays: number; weight: number; days: number; counted: boolean }[];
}

/* ------------------------------------------------------------------ dates */

const MS = 86_400_000;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDaysIso = (s: string, n: number) => fmt(new Date(parse(s).getTime() + n * MS));
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / MS);

export function addMonthsIso(s: string, n: number): string {
  const d = parse(s);
  const target = d.getUTCMonth() + n;
  const day = d.getUTCDate();
  const first = new Date(Date.UTC(d.getUTCFullYear(), target, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return fmt(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last))));
}

/** Whole months completed between two dates (1 Mar to 28 Feb is 11). */
export function completedMonths(from: string, to: string): number {
  if (to < from) return 0;
  let m = 0;
  while (addMonthsIso(from, m + 1) <= to) m += 1;
  return m;
}

/** The date a service milestone is reached. */
export const milestoneDate = (serviceStart: string, months: number) => addMonthsIso(serviceStart, months);

/* ------------------------------------------------------------------ rounding */

const EPS = 1e-9;

/** Round a quantity of days. Midpoints go up unless the tie rule says down. */
export function roundDays(value: number, mode: RoundingMode, tie: TieRule = 'UP'): number {
  const v = Math.round(value * 1e6) / 1e6;
  const unit = (step: number, how: 'floor' | 'ceil' | 'nearest') => {
    const x = v / step;
    if (how === 'floor') return Math.floor(x + EPS) * step;
    if (how === 'ceil') return Math.ceil(x - EPS) * step;
    const f = Math.floor(x + EPS);
    const frac = x - f;
    if (Math.abs(frac - 0.5) < EPS) return (tie === 'UP' ? f + 1 : f) * step;
    return (frac > 0.5 ? f + 1 : f) * step;
  };
  switch (mode) {
    case 'NONE': return Math.round(v * 100) / 100;
    case 'DOWN': return unit(1, 'floor');
    case 'UP': return unit(1, 'ceil');
    case 'NEAREST': return unit(1, 'nearest');
    case 'NEAREST_HALF': return unit(0.5, 'nearest');
    case 'UP_HALF': return unit(0.5, 'ceil');
    case 'DOWN_HALF': return unit(0.5, 'floor');
  }
}

/* ------------------------------------------------------------------ service slabs */

/** Annual days for someone with this many completed months of service. */
export function annualForService(slabs: ServiceSlab[], serviceMonths: number, fallback: number): number {
  const hit = slabs.find((s) => serviceMonths >= s.fromMonths && (s.toMonths === null || serviceMonths < s.toMonths));
  return hit ? hit.annualDays : fallback;
}

/** Problems with a set of slabs (overlaps, gaps, bad bounds). Empty = fine. */
export function validateSlabs(slabs: ServiceSlab[]): string[] {
  const out: string[] = [];
  const sorted = [...slabs].sort((a, b) => a.fromMonths - b.fromMonths);
  sorted.forEach((s, i) => {
    if (s.fromMonths < 0) out.push('Service cannot start before zero months');
    if (s.toMonths !== null && s.toMonths <= s.fromMonths) out.push(`A slab from ${s.fromMonths} months must end after it starts`);
    if (s.annualDays < 0) out.push('Days cannot be negative');
    const next = sorted[i + 1];
    if (next) {
      if (s.toMonths === null) out.push('Only the last slab can be open ended');
      else if (s.toMonths > next.fromMonths) out.push(`Slabs overlap around ${next.fromMonths} months`);
      else if (s.toMonths < next.fromMonths) out.push(`There is a gap between ${s.toMonths} and ${next.fromMonths} months`);
    }
  });
  if (sorted.length && sorted[0].fromMonths !== 0) out.push('The first slab must start at 0 months');
  return out;
}

/* ------------------------------------------------------------------ entitlement for a leave year */

/**
 * Days earned in one leave year, counted month by month (or day by day for EXACT_DAYS).
 * Each month takes the annual figure of the service slab in force, so crossing a milestone
 * part-way through the year is handled without a special case.
 */
export function entitlementForYear(input: EntitlementInput): EntitlementResult {
  const { yearStart, method } = input;
  const slabs = input.slabs ?? [];
  const timing = input.slabTiming ?? 'IMMEDIATE';
  const yearEnd = addDaysIso(addMonthsIso(yearStart, 12), -1);
  const empFrom = input.joinDate > yearStart ? input.joinDate : yearStart;
  const empTo = input.exitDate && input.exitDate < yearEnd ? input.exitDate : yearEnd;
  const annualAt = (date: string) => {
    if (!slabs.length) return input.annualDays;
    const at = timing === 'NEXT_YEAR' ? yearStart : date;
    return annualForService(slabs, completedMonths(input.serviceStart, at), input.annualDays);
  };
  const lines: EntitlementResult['lines'] = [];
  let raw = 0;

  if (method === 'EXACT_DAYS') {
    const yearDays = daysBetween(yearStart, yearEnd) + 1;
    for (let m = 0; m < 12; m += 1) {
      const ms = addMonthsIso(yearStart, m);
      const me = addDaysIso(addMonthsIso(yearStart, m + 1), -1);
      const from = ms > empFrom ? ms : empFrom;
      const to = me < empTo ? me : empTo;
      // The slab is judged at the first day of the block so a mid-month milestone splits the month.
      const blocks: [string, string][] = [];
      let cursor = from;
      if (to >= from) {
        if (slabs.length && timing === 'IMMEDIATE') {
          for (const s of slabs) {
            const ms2 = milestoneDate(input.serviceStart, s.fromMonths);
            if (ms2 > cursor && ms2 <= to) {
              blocks.push([cursor, addDaysIso(ms2, -1)]);
              cursor = ms2;
            }
          }
        }
        blocks.push([cursor, to]);
      }
      for (const [bf, bt] of blocks) {
        const days = daysBetween(bf, bt) + 1;
        const annual = annualAt(bf);
        const part = (annual * days) / yearDays;
        raw += part;
        lines.push({ from: bf, to: bt, annualDays: annual, weight: days / yearDays, days: Math.round(part * 1e4) / 1e4, counted: true });
      }
    }
  } else {
    for (let m = 0; m < 12; m += 1) {
      const ms = addMonthsIso(yearStart, m);
      const me = addDaysIso(addMonthsIso(yearStart, m + 1), -1);
      const overlap = empFrom <= me && empTo >= ms;
      const full = empFrom <= ms && empTo >= me;
      let counted: boolean;
      switch (method) {
        case 'NONE': counted = true; break;
        case 'COMPLETED_MONTHS': counted = full; break;
        case 'STARTED_MONTHS': counted = overlap; break;
        case 'CUTOFF_DAY': {
          const startsHere = empFrom > ms && empFrom <= me;
          counted = full || (overlap && (startsHere ? Number(empFrom.slice(8)) <= (input.cutoffDay ?? 15) : empTo >= me));
          break;
        }
      }
      const annual = annualAt(ms);
      const part = counted ? annual / 12 : 0;
      raw += part;
      lines.push({ from: ms, to: me, annualDays: annual, weight: counted ? 1 / 12 : 0, days: Math.round(part * 1e4) / 1e4, counted });
    }
  }

  let quantity = roundDays(raw, input.rounding, input.tie ?? 'UP');
  if (input.minDays != null && empFrom <= empTo) quantity = Math.max(quantity, input.minDays);
  if (input.maxDays != null) quantity = Math.min(quantity, input.maxDays);
  return { raw: Math.round(raw * 1e4) / 1e4, quantity, lines };
}

/* ------------------------------------------------------------------ choosing the policy */

export interface PolicyScope {
  countryCode?: string | null;
  branchId?: number | null;
  employmentTypeId?: number | null;
  employeeId?: number | null;
}
export interface ScopedPolicy {
  id: number;
  scope: PolicyScope;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** Statutory policies are combined with company ones; this is only for ordering ties. */
  priority: number;
}
export interface PolicySubject {
  employeeId: number;
  countryCode: string | null;
  branchId: number | null;
  employmentTypeId: number | null;
}

/** How specific a scope is for a person, or -1 if it does not apply. An employee override beats everything. */
export function scopeScore(scope: PolicyScope, who: PolicySubject): number {
  if (scope.employeeId != null) return scope.employeeId === who.employeeId ? 1000 : -1;
  let score = 0;
  if (scope.employmentTypeId != null) {
    if (scope.employmentTypeId !== who.employmentTypeId) return -1;
    score += 4;
  }
  if (scope.branchId != null) {
    if (scope.branchId !== who.branchId) return -1;
    score += 8;
  }
  if (scope.countryCode != null) {
    if (scope.countryCode !== who.countryCode) return -1;
    score += 2;
  }
  return score;
}

/** The single policy in force for this person on this date: the most specific, then the highest priority, then the newest. */
export function pickPolicy<T extends ScopedPolicy>(policies: T[], who: PolicySubject, date: string): T | null {
  const live = policies
    .filter((p) => p.effectiveFrom <= date && (p.effectiveTo === null || p.effectiveTo >= date))
    .map((p) => ({ p, score: scopeScore(p.scope, who) }))
    .filter((x) => x.score >= 0);
  live.sort((a, b) => b.score - a.score || b.p.priority - a.p.priority || (a.p.effectiveFrom < b.p.effectiveFrom ? 1 : -1) || b.p.id - a.p.id);
  return live[0]?.p ?? null;
}
