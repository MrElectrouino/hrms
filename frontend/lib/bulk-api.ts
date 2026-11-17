import { request } from './api';

export interface BulkField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'yn';
  required: boolean;
  options: { value: string; label: string }[];
}
export interface BulkEmployee {
  id: number;
  code: string;
  name: string;
  branchId: number | null;
  branchName: string | null;
  designation: string | null;
  department: string | null;
}
export interface BulkResult {
  updated: number;
  fields: string[];
  skipped: { employeeId: number; code: string; reason: string }[];
}

export const getBulkFields = () => request<BulkField[]>('/bulk-update/fields');
export const getBulkEmployees = (branchIds: number[], search: string, limit?: number) =>
  request<BulkEmployee[]>(`/bulk-update/employees?branchIds=${branchIds.join(',')}&search=${encodeURIComponent(search)}${limit ? `&limit=${limit}` : ''}`);

/** For a dropdown that loads as you type: the first few matches only, never the whole list. */
export const searchEmployeeOptions = async (query: string) =>
  (await getBulkEmployees([], query, 25)).data.map((e) => ({ value: String(e.id), label: `${e.name} (${e.code})`, hint: e.branchName ?? undefined }));
export const applyBulkUpdate = (employeeIds: number[], changes: { field: string; value: string | null }[]) =>
  request<BulkResult>('/bulk-update/apply', { method: 'POST', body: JSON.stringify({ employeeIds, changes }) });
