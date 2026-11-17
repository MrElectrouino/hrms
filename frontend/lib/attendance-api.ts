import { API_BASE_URL, getAccessToken, request } from './api';

/* ------------------------------------------------------------------ types */

export interface WorkSchedule {
  id: number;
  code: string;
  name: string;
  scheduleType: 'FIXED' | 'FLEXIBLE';
  startTime: string | null;
  endTime: string | null;
  earliestStartTime: string | null;
  latestStartTime: string | null;
  requiredDailyMinutes: number;
  breakMinutes: number;
  breakAfterMinutes: number;
  isActive: boolean;
}
export type WorkSchedulePayload = Omit<WorkSchedule, 'id'>;

export type HolidayLevel = 'EMPLOYEE' | 'BRANCH' | 'COUNTRY' | 'COMPANY';

export interface HolidayCalendar {
  id: number;
  name: string;
  scope: 'COMPANY' | 'COUNTRY' | 'BRANCH';
  countryCode: string | null;
  branchId: number | null;
  branchName: string | null;
  isActive: boolean;
  holidayCount: number;
  employeeCount: number;
}
export interface HolidayCalendarPayload {
  name: string;
  scope: string;
  countryCode?: string;
  branchId?: number;
  isActive?: boolean;
}
export interface Holiday {
  id: number;
  date: string;
  /** Last day of a holiday that lasts several days; empty for a single day. */
  endDate?: string | null;
  name: string;
  holidayType: string;
}

export interface RosterPatternDay {
  dayIndex: number;
  shiftId: number | null;
  isWeeklyOff: boolean;
}
export interface RosterPattern {
  id: number;
  name: string;
  cycleDays: number;
  isActive: boolean;
  employeeCount: number;
  days: RosterPatternDay[];
}

export interface ImportRowError {
  row: number;
  message: string;
}
export interface ImportResult {
  committed: boolean;
  totalRows: number;
  validRows: number;
  importedRows?: number;
  errors: ImportRowError[];
  preview?: Record<string, unknown>[];
}

export interface AssignmentRow {
  id: number;
  ref: { id: number; name: string };
  effectiveFrom: string;
  effectiveTo: string | null;
  anchorDate?: string | null;
}
export interface Assignments {
  workSchedules: AssignmentRow[];
  rosterPatterns: AssignmentRow[];
  holidayCalendars: AssignmentRow[];
  weeklyOffs: AssignmentRow[];
}

export interface ResolvedDay {
  date: string;
  holiday: { name: string; type: string; calendarLevel: HolidayLevel } | null;
  roster: { source: 'ENTRY' | 'PATTERN' | 'TEMPLATE' | 'NONE'; isWeeklyOff: boolean; shift: { id: number; name: string } | null };
  workSchedule: { id: number; name: string; scheduleType: string } | null;
}

/* ------------------------------------------------------------------ calls */

const json = (body: unknown) => JSON.stringify(body);

export const getWorkSchedules = () => request<WorkSchedule[]>('/attendance/work-schedules');
export const createWorkSchedule = (p: WorkSchedulePayload) => request<WorkSchedule>('/attendance/work-schedules', { method: 'POST', body: json(p) });
export const updateWorkSchedule = (id: number, p: WorkSchedulePayload) => request<WorkSchedule>(`/attendance/work-schedules/${id}`, { method: 'PUT', body: json(p) });

export const getHolidayOrder = () => request<HolidayLevel[]>('/attendance/holiday-order');
export const saveHolidayOrder = (order: HolidayLevel[]) => request<HolidayLevel[]>('/attendance/holiday-order', { method: 'PUT', body: json({ order }) });

export const getHolidayCalendars = () => request<HolidayCalendar[]>('/attendance/holiday-calendars');
export const createHolidayCalendar = (p: HolidayCalendarPayload) => request<HolidayCalendar>('/attendance/holiday-calendars', { method: 'POST', body: json(p) });
export const updateHolidayCalendar = (id: number, p: HolidayCalendarPayload) => request<HolidayCalendar>(`/attendance/holiday-calendars/${id}`, { method: 'PUT', body: json(p) });
export const getHolidayCalendar = (id: number) => request<HolidayCalendar & { holidays: Holiday[] }>(`/attendance/holiday-calendars/${id}`);
export const saveHoliday = (id: number, p: { date: string; endDate?: string | null; name: string; holidayType?: string }) => request<Holiday>(`/attendance/holiday-calendars/${id}/holidays`, { method: 'POST', body: json(p) });
export const updateHoliday = (id: number, holidayId: number, p: { date: string; endDate?: string | null; name: string; holidayType?: string }) => request<Holiday>(`/attendance/holiday-calendars/${id}/holidays/${holidayId}`, { method: 'PUT', body: json(p) });
export const removeHoliday = (id: number, holidayId: number) => request<null>(`/attendance/holiday-calendars/${id}/holidays/${holidayId}`, { method: 'DELETE' });

export const getRosterPatterns = () => request<RosterPattern[]>('/attendance/roster-patterns');
export const createRosterPattern = (p: { name: string; cycleDays: number; days: { dayIndex: number; shiftId?: number | null; isWeeklyOff: boolean }[]; isActive?: boolean }) =>
  request<RosterPattern>('/attendance/roster-patterns', { method: 'POST', body: json(p) });
export const updateRosterPattern = (id: number, p: { name: string; cycleDays: number; days: { dayIndex: number; shiftId?: number | null; isWeeklyOff: boolean }[]; isActive?: boolean }) =>
  request<RosterPattern>(`/attendance/roster-patterns/${id}`, { method: 'PUT', body: json(p) });

export const getAssignments = (employeeId: number) => request<Assignments>(`/attendance/employees/${employeeId}/assignments`);
export const assignWorkSchedule = (employeeId: number, p: { workScheduleId: number; effectiveFrom: string }) => request<unknown>(`/attendance/employees/${employeeId}/work-schedule`, { method: 'POST', body: json(p) });
export const assignRosterPattern = (employeeId: number, p: { patternId: number; effectiveFrom: string; anchorDate?: string }) => request<unknown>(`/attendance/employees/${employeeId}/roster-pattern`, { method: 'POST', body: json(p) });
export const assignWeeklyOffTemplate = (employeeId: number, p: { templateId: number | null; effectiveFrom: string }) => request<unknown>(`/attendance/employees/${employeeId}/weekly-off`, { method: 'POST', body: json(p) });
export const assignHolidayCalendar = (employeeId: number, p: { calendarId: number; effectiveFrom: string }) => request<unknown>(`/attendance/employees/${employeeId}/holiday-calendar`, { method: 'POST', body: json(p) });
export const removeAssignment = (employeeId: number, kind: 'work-schedule' | 'roster-pattern' | 'holiday-calendar' | 'weekly-off', id: number) =>
  request<null>(`/attendance/employees/${employeeId}/assignments/${kind}/${id}`, { method: 'DELETE' });
/** A schedule, weekly off or roster pattern given to a branch, a country or the whole company. */
export interface GroupAssignment {
  id: number;
  kind: 'WORK_SCHEDULE' | 'WEEKLY_OFF' | 'ROSTER_PATTERN';
  scope: 'COMPANY' | 'COUNTRY' | 'BRANCH';
  countryCode: string | null;
  branchId: number | null;
  ref: { id: number; name: string };
  effectiveFrom: string;
  effectiveTo: string | null;
  anchorDate: string | null;
}
export const getGroupAssignments = () => request<GroupAssignment[]>('/attendance/group-assignments');
export const assignToGroup = (p: { kind: GroupAssignment['kind']; scope: GroupAssignment['scope']; countryCode?: string; branchId?: number; refId: number; effectiveFrom: string; anchorDate?: string }) =>
  request<unknown>('/attendance/group-assignments', { method: 'POST', body: json(p) });
export const removeGroupAssignment = (id: number) => request<null>(`/attendance/group-assignments/${id}`, { method: 'DELETE' });
export const getEmployeeCalendar = (employeeId: number, from: string, to: string) =>
  request<{ employeeId: number; country: string; holidayOrder: HolidayLevel[]; days: ResolvedDay[] }>(`/attendance/employees/${employeeId}/calendar?from=${from}&to=${to}`);
export const setRosterEntry = (p: { employeeId: number; date: string; shiftId?: number | null; isWeeklyOff: boolean }) => request<unknown>('/attendance/roster/entries', { method: 'PUT', body: json(p) });
export const clearRosterEntry = (employeeId: number, date: string) => request<null>(`/attendance/employees/${employeeId}/roster/${date}`, { method: 'DELETE' });

/** Uploads an .xlsx for checking (commit=false) or saving the valid rows (commit=true). */
function upload(path: string, file: File, commit: boolean) {
  const form = new FormData();
  form.append('file', file);
  return request<ImportResult>(`${path}?commit=${commit}`, { method: 'POST', body: form });
}
export const importHolidays = (calendarId: number, file: File, commit: boolean) => upload(`/attendance/holiday-calendars/${calendarId}/import`, file, commit);
export const importRoster = (file: File, commit: boolean) => upload('/attendance/roster/import', file, commit);

/** Downloads a file from the API with the sign-in token and hands it to the browser. */
export async function downloadFile(path: string, fileName: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Could not download the template');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** A weekday that is off only some weeks: the chosen occurrences in the month (1-5, -1 = last), or every other week from a date. */
export type WeeklyOffRule = { day: number; kind: 'WEEKS'; weeks: number[] } | { day: number; kind: 'ALTERNATE'; anchor: string };

export interface WeeklyOffTemplate {
  id: number;
  name: string;
  /** Weekdays off every week: 0 = Sunday ... 6 = Saturday. */
  days: number[];
  rules: WeeklyOffRule[];
  daysText: string;
  note: string | null;
  isActive: boolean;
  employeeCount: number;
  everAssigned: boolean;
}
export type WeeklyOffPayload = { name: string; days: number[]; rules?: WeeklyOffRule[]; note?: string | null; isActive?: boolean };
export const getWeeklyOffTemplates = () => request<WeeklyOffTemplate[]>('/attendance/weekly-off-templates');
export const createWeeklyOffTemplate = (p: WeeklyOffPayload) => request<WeeklyOffTemplate>('/attendance/weekly-off-templates', { method: 'POST', body: json(p) });
export const updateWeeklyOffTemplate = (id: number, p: WeeklyOffPayload) => request<WeeklyOffTemplate>(`/attendance/weekly-off-templates/${id}`, { method: 'PUT', body: json(p) });
export const deleteWeeklyOffTemplate = (id: number) => request<null>(`/attendance/weekly-off-templates/${id}`, { method: 'DELETE' });
