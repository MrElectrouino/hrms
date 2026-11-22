import { request } from './api';

export interface Slab {
  fromMonths: number;
  toMonths: number | null;
  annualDays: number;
}
export interface PolicyRule {
  id?: number;
  leaveTypeId: number;
  leaveType?: string;
  annualDays: number;
  creditMethod: 'UPFRONT' | 'MONTHLY' | 'MONTHLY_LUMP' | 'NONE';
  slabs: Slab[];
  slabTiming: 'NEXT_YEAR' | 'IMMEDIATE';
  proration: 'NONE' | 'COMPLETED_MONTHS' | 'STARTED_MONTHS' | 'CUTOFF_DAY' | 'EXACT_DAYS';
  cutoffDay: number | null;
  rounding: 'NONE' | 'DOWN' | 'UP' | 'NEAREST' | 'NEAREST_HALF' | 'UP_HALF' | 'DOWN_HALF';
  tieRule: 'UP' | 'DOWN';
  minDays: number | null;
  maxDays: number | null;
  /** Optional formula, for example "workdays * annualDays / yearDays"; replaces the joining-part-way method. */
  formula?: string | null;
  /** Service counts from the joining date or (when there is one) the rejoining date. */
  serviceBasis?: 'JOINING_DATE' | 'REJOINING_DATE';
}
export interface LeavePolicy {
  id: number;
  name: string;
  layer: 'STATUTORY' | 'COMPANY';
  countryCode: string | null;
  branchId: number | null;
  employeeTypeId: number | null;
  employeeId: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  priority: number;
  isActive: boolean;
  note: string | null;
  used: boolean;
  rules: PolicyRule[];
}
export type LeavePolicyPayload = Omit<LeavePolicy, 'id' | 'used'>;

export interface EntitlementPreview {
  yearStart: string;
  yearEnd: string;
  /** Date of confirmation (on payroll), if set. */
  confirmedOn?: string | null;
  applied: { policyId: number; policy: string; layer: string; creditMethod: string }[];
  winner: { policyId: number; policy: string; layer: string; creditMethod: string } | null;
  quantity: number | null;
  raw: number | null;
  lines: { from: string; to: string; annualDays: number; days: number; counted: boolean }[];
}

export const getLeavePolicies = () => request<LeavePolicy[]>('/leave-policies');
export const createLeavePolicy = (p: LeavePolicyPayload) => request<LeavePolicy>('/leave-policies', { method: 'POST', body: JSON.stringify(p) });
export const updateLeavePolicy = (id: number, p: LeavePolicyPayload) => request<LeavePolicy>(`/leave-policies/${id}`, { method: 'PUT', body: JSON.stringify(p) });
export const deleteLeavePolicy = (id: number) => request<null>(`/leave-policies/${id}`, { method: 'DELETE' });
export const previewEntitlement = (employeeId: number, leaveTypeId: number, yearStart: string) =>
  request<EntitlementPreview | null>(`/leave-policies/preview?employeeId=${employeeId}&leaveTypeId=${leaveTypeId}&yearStart=${yearStart}`);

export const PRORATION_LABEL: Record<PolicyRule['proration'], string> = {
  NONE: 'No proration (full year)',
  COMPLETED_MONTHS: 'Completed months',
  STARTED_MONTHS: 'Started months (joining month counts)',
  CUTOFF_DAY: 'Joining month counts if joined by a cut-off day',
  EXACT_DAYS: 'Exact calendar days',
};
export const ROUNDING_LABEL: Record<PolicyRule['rounding'], string> = {
  NONE: 'No rounding',
  DOWN: 'Down to a whole day',
  UP: 'Up to a whole day',
  NEAREST: 'Nearest whole day',
  NEAREST_HALF: 'Nearest half day',
  UP_HALF: 'Up to a half day',
  DOWN_HALF: 'Down to a half day',
};
export const CREDIT_LABEL: Record<PolicyRule['creditMethod'], string> = {
  UPFRONT: 'Whole year on the first day',
  MONTHLY: 'A share each month',
  MONTHLY_LUMP: 'A share each month; the rest of the year at once when confirmed',
  NONE: 'Not credited automatically',
};
