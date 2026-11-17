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
export const getBulkEmployees = (branchIds: number[], search: string) =>
  request<BulkEmployee[]>(`/bulk-update/employees?branchIds=${branchIds.join(',')}&search=${encodeURIComponent(search)}`);
export const applyBulkUpdate = (employeeIds: number[], changes: { field: string; value: string | null }[]) =>
  request<BulkResult>('/bulk-update/apply', { method: 'POST', body: JSON.stringify({ employeeIds, changes }) });
