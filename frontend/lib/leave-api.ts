import { request } from './api';

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  isPaid: boolean;
  balanceTracking: boolean;
  accrual: 'NONE' | 'ANNUAL' | 'MONTHLY';
  annualDays: string | number;
  allowHalfDay: boolean;
  allowNegative: boolean;
  requiresDocument: boolean;
  documentAfterDays: number;
  maxDaysPerRequest: number | null;
  isSandwichEligible: boolean;
  isCompOff: boolean;
  isActive: boolean;
}
export type LeaveTypePayload = Omit<LeaveType, 'id'>;

export interface LeaveSettings {
  sandwichEnabled: boolean;
  sandwichWeeklyOffs: boolean;
  sandwichHolidays: boolean;
  sandwichRequireBothSides: boolean;
  leaveYearStartMonth: number;
  compOffEnabled: boolean;
  compOffCreditDays: string | number;
  compOffExpiryDays: number | null;
  compOffMinWorkedMinutes: number;
}

export interface LeaveBalance {
  leaveTypeId: number;
  code: string;
  name: string;
  isPaid: boolean;
  balanceTracking: boolean;
  balance: number;
  pending: number;
  available: number;
  nextExpiry: string | null;
}

export interface CalcDay {
  date: string;
  kind: 'WORKING' | 'WEEKLY_OFF' | 'HOLIDAY';
  days: number;
  reason: 'LEAVE' | 'HALF_DAY' | 'OFF_NOT_COUNTED' | 'SANDWICH_WEEKLY_OFF' | 'SANDWICH_HOLIDAY';
}

export interface LeavePreview {
  requestedDays: number;
  sandwichDays: number;
  totalDays: number;
  days: CalcDay[];
  leaveType: { id: number; name: string; isPaid: boolean };
  available: number | null;
  enough: boolean;
  warnings: string[];
}

export interface LeaveApplication {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  leaveType: { id: number; code: string; name: string; isPaid: boolean };
  fromDate: string;
  toDate: string;
  halfDayPart: string | null;
  requestedDays: number;
  sandwichDays: number;
  totalDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string | null;
  decisionNote: string | null;
  createdAt: string;
  calculation: CalcDay[];
}

export interface LedgerRow {
  id: number;
  kind: string;
  days: number;
  leaveType: string;
  note: string | null;
  createdAt: string;
}

export interface LeaveRequestPayload {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  halfDayPart?: 'FIRST' | 'SECOND';
  reason?: string;
}

const json = (b: unknown) => JSON.stringify(b);

export const getLeaveTypes = () => request<LeaveType[]>('/leave/types');
export const getMyBalances = () => request<LeaveBalance[]>('/leave/balances');
export const getBalancesOf = (employeeId: number) => request<LeaveBalance[]>(`/leave/balances/${employeeId}`);
export const previewLeave = (p: LeaveRequestPayload) => request<LeavePreview>('/leave/preview', { method: 'POST', body: json(p) });
export const applyLeave = (p: LeaveRequestPayload) => request<LeaveApplication>('/leave/applications', { method: 'POST', body: json(p) });
export const getMyLeave = () => request<LeaveApplication[]>('/leave/applications/me');
export const getTeamLeave = (status?: string) => request<LeaveApplication[]>(`/leave/applications/team${status ? `?status=${status}` : ''}`);
export const decideLeave = (id: number, approve: boolean, note?: string) => request<null>(`/leave/applications/${id}/decision`, { method: 'PUT', body: json({ approve, note }) });
export const cancelLeave = (id: number) => request<null>(`/leave/applications/${id}/cancel`, { method: 'PUT' });
export const getLeaveCalendar = (from: string, to: string, scope: 'me' | 'team') => request<LeaveApplication[]>(`/leave/calendar?from=${from}&to=${to}&scope=${scope}`);
export const getLedger = (employeeId?: number) => request<LedgerRow[]>(`/leave/ledger${employeeId ? `?employeeId=${employeeId}` : ''}`);
export const adjustBalance = (p: { employeeId: number; leaveTypeId: number; days: number; note: string; expiresOn?: string }) => request<LeaveBalance[]>('/leave/adjust', { method: 'POST', body: json(p) });
export const runAccrual = (asOf?: string) => request<{ asOf: string; leaveYear: string; credited: number; alreadyCredited: number }>('/leave/accrual', { method: 'POST', body: json({ asOf }) });
export const syncCompOff = () => request<{ granted: number }>('/leave/comp-off/sync', { method: 'POST' });

export const getLeaveConfig = () => request<{ types: LeaveType[]; settings: LeaveSettings }>('/leave-config');
export const createLeaveType = (p: LeaveTypePayload) => request<LeaveType>('/leave-config/types', { method: 'POST', body: json(p) });
export const deleteLeaveType = (id: number) => request<null>(`/leave-config/types/${id}`, { method: 'DELETE' });
export const updateLeaveType = (id: number, p: LeaveTypePayload) => request<LeaveType>(`/leave-config/types/${id}`, { method: 'PUT', body: json(p) });
export const saveLeaveSettings = (p: LeaveSettings) => {
  const { sandwichEnabled, sandwichWeeklyOffs, sandwichHolidays, sandwichRequireBothSides, leaveYearStartMonth, compOffEnabled, compOffCreditDays, compOffExpiryDays, compOffMinWorkedMinutes } = p;
  return request<LeaveSettings>('/leave-config/settings', {
    method: 'PUT',
    body: json({ sandwichEnabled, sandwichWeeklyOffs, sandwichHolidays, sandwichRequireBothSides, leaveYearStartMonth, compOffEnabled, compOffCreditDays, compOffExpiryDays, compOffMinWorkedMinutes }),
  });
};

export const REASON_TEXT: Record<CalcDay['reason'], string> = {
  LEAVE: 'Leave',
  HALF_DAY: 'Half day',
  OFF_NOT_COUNTED: 'Off day (not counted)',
  SANDWICH_WEEKLY_OFF: 'Weekly off counted (sandwich)',
  SANDWICH_HOLIDAY: 'Holiday counted (sandwich)',
};
