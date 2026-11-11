// Vercel service binding is available at runtime in server functions only.
// Browser requests use the same-origin /api/v1 path that Vercel rewrites to the backend service.
// Under `next dev` there is no Vercel rewrite, so the browser calls the API on port 3000 directly.
const LOCAL_API_BASE_URL = 'http://localhost:3000/api/v1';

export const API_BASE_URL =
  typeof window === 'undefined'
    ? (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000/api/v1')
    : (process.env.NEXT_PUBLIC_API_BASE_URL ||
        (process.env.NODE_ENV === 'development' ? LOCAL_API_BASE_URL : '/api/v1'));

export interface ApiEnvelope<T> {
  data: T;
  message?: { code: string; text: string };
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  mustChangePassword: boolean;
  user: {
    id: number;
    username: string;
    userTypeId: number;
    profileId: number;
  };
}

export interface UserType {
  id: number;
  name: string;
  isActive: boolean;
}

export interface User {
  id: number;
  username: string;
  userTypeId: number;
  profileId: number;
  isActive: boolean;
  userType: { id: number; name: string };
  profile: {
    id: number;
    name: string;
    lastName?: string;
    email?: string;
    contactNo?: string;
    isSiteAccess: boolean;
  };
}

export interface CreateUserPayload {
  username: string;
  password: string;
  userTypeId: number;
  profileId?: number;
}

export interface UpdateUserPayload {
  userTypeId?: number;
  isActive?: boolean;
}

export interface Dependant {
  id: number;
  employeeProfileId: number;
  dependantProfileId: number;
  relationTypeId?: number;
  dependantProfile: {
    id: number;
    name: string;
    lastName?: string;
    email?: string;
    contactNo?: string;
    dateOfBirth?: string;
    genderId?: number;
  };
}

export interface CreateDependantPayload {
  firstName: string;
  lastName?: string;
  email?: string;
  contactNo?: string;
  dateOfBirth?: string;
  genderId?: number;
  relationTypeId?: number;
}

export interface Parameter {
  id: number;
  text: string;
  parameterValue: number;
  code?: string | null;
  parameterTypeId: number;
  parameterType?: { id: number; name: string };
}

export interface Employee {
  id: number;
  employeeCode: string;
  profileId: number;
  reportingToId?: number;
  sourceOfHireId?: number;
  locationId?: number;
  siteId?: number;
  employeeStatusId?: number;
  employeeTypeId?: number;
  contractTypeId?: number;
  workPhone?: string;
  extension?: string;
  workEmail?: string;
  dateOfJoining: string;
  dateOfConfirmation?: string;
  personIdNumber?: string;
  designation?: string;
  shiftId?: number;
  isActive: boolean;
  profile: {
    id: number;
    name: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    contactNo?: string;
    dateOfBirth?: string;
    maritalStatusId?: number;
    genderId?: number;
    bloodGroupId?: number;
    nationalityId?: number;
    visaTypeId?: number;
    motherTongueId?: number;
    address?: string;
    homeCountryAddress?: string;
    homeCountryPhoneNo?: string;
    qualification?: string;
    dateOfExit?: string;
    exitReasonCode?: number;
    isSiteAccess: boolean;
    departments?: { departmentId: number; department: { id: number; name: string } }[];
  };
  site?: { id: number; name: string };
  shift?: { id: number; name: string };
  reportingTo?: {
    id: number;
    employeeCode: string;
    profile: { name: string; lastName?: string };
  };
}

export interface CreateEmployeePayload {
  firstName: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  contactNo?: string;
  dateOfBirth?: string;
  maritalStatusId?: number;
  genderId?: number;
  bloodGroupId?: number;
  nationalityId?: number;
  visaTypeId?: number;
  motherTongueId?: number;
  address?: string;
  homeCountryAddress?: string;
  homeCountryPhoneNo?: string;
  qualification?: string;
  dateOfExit?: string;
  exitReasonCode?: number;
  employeeCode: string;
  reportingToId?: number;
  sourceOfHireId?: number;
  locationId?: number;
  siteId?: number;
  employeeStatusId?: number;
  employeeTypeId?: number;
  contractTypeId?: number;
  workPhone?: string;
  extension?: string;
  workEmail?: string;
  dateOfJoining: string;
  dateOfConfirmation?: string;
  personIdNumber?: string;
  designation?: string;
  shiftId?: number;
  departmentIds?: number[];
  isSiteAccess?: boolean;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  isActive?: boolean;
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return accessToken || localStorage.getItem('accessToken');
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function clearTokens() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message?.text || res.statusText);
  }

  setAccessToken(json.data.accessToken);
  setRefreshToken(json.data.refreshToken);
  return json.data.accessToken as string;
}

async function refreshTokens(): Promise<string> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = doRefresh()
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }
  if (!refreshPromise) throw new Error('Refresh not initialized');
  return refreshPromise;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<ApiEnvelope<T>> {
  const url = `${API_BASE_URL}${path}`;
  const token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !isRetry && path !== '/auth/refresh' && getRefreshToken()) {
      try {
        await refreshTokens();
      } catch {
        clearTokens();
        throw new Error('Session expired. Please login again.');
      }
      return request<T>(path, options, true);
    }
    const error = new Error(json?.message?.text || response.statusText) as Error & { errors?: FieldErrorItem[] };
    error.errors = json?.errors;
    throw error;
  }

  return json as ApiEnvelope<T>;
}

export async function login(username: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await request('/auth/logout', {
      method: 'POST',
      headers: { 'X-Refresh-Token': refreshToken },
    }).catch(() => {
      // ignore
    });
  }
  clearTokens();
}

export async function refreshAccessToken() {
  const accessToken = await doRefresh();
  return { data: { accessToken } } as ApiEnvelope<Pick<LoginResponse, 'accessToken'>>;
}

export async function getUserTypes() {
  return request<UserType[]>('/rbac/user-types');
}

export async function getMyMenu() {
  return request<MenuNode[]>('/rbac/my-menu');
}

export interface MenuFlags {
  isCreate: boolean;
  isEdit: boolean;
  isDelete: boolean;
}

export interface MenuNode {
  id: number;
  name: string;
  pageUrl?: string | null;
  iconClass?: string | null;
  displayOrder: number;
  isMainMenu: boolean;
  isActive: boolean;
  permissions?: MenuFlags;
  children: MenuNode[];
}

export async function getUsers(params?: Record<string, string | number | boolean>) {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
  return request<User[]>(`/users${query}`);
}

export async function createUser(payload: CreateUserPayload) {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: UpdateUserPayload) {
  return request<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateUser(id: number) {
  return request<User>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export async function resetUserPassword(id: number, newPassword: string) {
  return request<null>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export interface Document {
  id: number;
  documentTypeId: number;
  profileId: number;
  issueDate?: string;
  expiryDate?: string;
  identityNo?: string;
  documentTitle?: string;
  remarks?: string;
  isSelf: boolean;
  isActive: boolean;
  documentType: { id: number; name: string };
  profile: { id: number; name: string; lastName?: string };
  files?: { file: { id: number; originalName: string; mimeType: string; sizeBytes: number } }[];
}

export interface CreateDocumentPayload {
  profileId: number;
  documentTypeId: number;
  issueDate?: string;
  expiryDate?: string;
  identityNo?: string;
  documentTitle?: string;
  remarks?: string;
  isSelf?: boolean;
}

export async function getEmployees(params?: Record<string, string | number | boolean>) {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
  return request<Employee[]>(`/employees${query}`);
}

export async function createEmployee(payload: CreateEmployeePayload) {
  return request<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDepartments(params?: Record<string, string | number | boolean>) {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
  return request<{ id: number; name: string; isActive: boolean }[]>(`/masters/departments${query}`);
}

export async function getLanguages() {
  return request<{ id: number; name: string }[]>('/masters/languages');
}

export async function getShifts() {
  return request<{ id: number; name: string }[]>('/masters/shifts');
}

export async function getSites() {
  return request<{ id: number; name: string }[]>('/masters/sites');
}

export async function getDocumentTypes() {
  return request<{ id: number; name: string }[]>('/masters/document-types');
}

export async function getDocuments(params?: Record<string, string | number | boolean>) {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
  return request<Document[]>(`/documents${query}`);
}

export async function createDocument(payload: CreateDocumentPayload) {
  return request<Document>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function attachDocumentFile(documentId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<any>(`/documents/${documentId}/files`, {
    method: 'POST',
    body: formData,
  });
}

export async function getEmployee(id: number) {
  return request<Employee>(`/employees/${id}`);
}

export async function updateEmployee(id: number, payload: UpdateEmployeePayload) {
  return request<Employee>(`/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getEmployeeDependants(id: number) {
  return request<Dependant[]>(`/employees/${id}/dependants`);
}

export async function createEmployeeDependant(id: number, payload: CreateDependantPayload) {
  return request<Dependant>(`/employees/${id}/dependants`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEmployeeDependant(
  id: number,
  dependantId: number,
  payload: Partial<CreateDependantPayload>,
) {
  return request<Dependant>(`/employees/${id}/dependants/${dependantId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployeeDependant(id: number, dependantId: number) {
  return request<null>(`/employees/${id}/dependants/${dependantId}`, {
    method: 'DELETE',
  });
}

export async function getParameters(typeCode: string) {
  return request<Parameter[]>(`/masters/parameters?typeCode=${encodeURIComponent(typeCode)}&pageSize=100`);
}

export async function downloadDocumentFile(documentId: number, fileId: number): Promise<string> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message?.text || res.statusText);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function forgotPassword(email: string) {
  return request<null>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  return request<null>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

/* ---------------- Employee profile (D-023) ---------------- */

export interface ProfileFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'multiselect' | 'yn';
  options?: string[];
  required?: boolean;
  sensitive?: boolean;
  mono?: boolean;
  wide?: boolean;
  hint?: string;
  maxLength?: number;
  display?: "checkbox";
  /** Value/label pairs (e.g. employee id → name) when the stored value is not the label. */
  optionItems?: { value: string; label: string }[];
}

export interface ProfileRowsDef {
  key: string;
  label: string;
  addLabel: string;
  max: number;
  fields: ProfileFieldDef[];
}

export interface ProfileGroupDef {
  title: string;
  fields?: ProfileFieldDef[];
  rows?: ProfileRowsDef;
  addressLevels?: 'present' | 'permanent';
  showWhen?: { key: string; equals: string };
  columns?: 2 | 3 | 4;
  sameAsKey?: string;
  salaryComponents?: boolean;
}

export interface ProfileSectionDef {
  key: string;
  title: string;
  group: string;
  description: string;
  hrOnly: boolean;
  groups: ProfileGroupDef[];
}

export interface CustomFieldInfo {
  code: string;
  label: string;
  tabKey: string;
  sectionName: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  isSensitive: boolean;
  helpText: string | null;
}

export interface CustomFieldAdmin extends CustomFieldInfo {
  countryCode: string;
  isActive: boolean;
}

export interface EmployeeProfileResponse {
  employee: {
    id: number;
    employeeCode: string;
    name: string;
    isActive: boolean;
    hasPhoto: boolean;
    country: string;
    currency: string;
    addressLevels: string[];
    legalEntities: string[];
  };
  canEdit: boolean;
  sections: ProfileSectionDef[];
  values: Record<string, Record<string, any>>;
  customFields: CustomFieldInfo[];
  custom: Record<string, any>;
  salaryTemplates: SalaryTemplate[];
}

export interface FieldErrorItem {
  field: string;
  message: string;
}

export async function getEmployeeProfile(id: number) {
  return request<EmployeeProfileResponse>(`/employees/${id}/profile`);
}

export async function saveEmployeeProfileSection(
  id: number,
  section: string,
  data: Record<string, any>,
  custom: Record<string, any>,
) {
  return request<{ section: string; values: Record<string, any> }>(`/employees/${id}/profile/${section}`, {
    method: 'PUT',
    body: JSON.stringify({ data, custom }),
  });
}

export async function getCustomFieldDefinitions() {
  return request<CustomFieldAdmin[]>('/custom-fields');
}

export interface CreateCustomFieldPayload {
  label: string;
  tabKey: string;
  sectionName: string;
  fieldType: string;
  options?: string[];
  countryCode?: string;
  isRequired?: boolean;
  isSensitive?: boolean;
  helpText?: string;
}

export async function createCustomField(payload: CreateCustomFieldPayload) {
  return request<CustomFieldAdmin>('/custom-fields', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateCustomField(code: string, payload: { isActive?: boolean; label?: string; isRequired?: boolean }) {
  return request<CustomFieldAdmin>(`/custom-fields/${code}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/* ---------------- Employee photo (BR-MD-09: JPEG/PNG, max 10 MB) ---------------- */

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export async function uploadEmployeePhoto(id: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ fileId: string; originalName: string; mimeType: string }>(`/employees/${id}/photo`, { method: "POST", body: form });
}

/** Fetches the photo with the access token and returns an object URL, or null when there is none. */
export async function getEmployeePhotoUrl(id: number): Promise<string | null> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/employees/${id}/photo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(res.statusText);
  return URL.createObjectURL(await res.blob());
}

/* ---------------- Salary templates (D-024) and Add Employee ---------------- */

export interface SalaryTemplate {
  id: number;
  name: string;
  countryCode: string;
  isActive: boolean;
  components: { code: string; label: string }[];
}

export interface BlankProfileResponse {
  country: string;
  currency: string;
  addressLevels: string[];
  sections: ProfileSectionDef[];
  salaryTemplates: SalaryTemplate[];
  customFields: CustomFieldInfo[];
}

export async function getBlankProfile(country: string) {
  return request<BlankProfileResponse>(`/employee-profile/blank?country=${encodeURIComponent(country)}`);
}

export async function validateNewProfile(country: string, sections: Record<string, { data: Record<string, any>; custom: Record<string, any> }>) {
  return request<{ country: string; valid: boolean; errors: Record<string, FieldErrorItem[]> }>('/employee-profile/validate', {
    method: 'POST',
    body: JSON.stringify({ country, sections }),
  });
}

export async function getSalaryTemplates() {
  return request<SalaryTemplate[]>('/salary-templates');
}

export interface SalaryTemplatePayload {
  name?: string;
  countryCode?: string;
  isActive?: boolean;
  components?: { label: string; code?: string }[];
}

export async function createSalaryTemplate(payload: SalaryTemplatePayload) {
  return request<SalaryTemplate>('/salary-templates', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSalaryTemplate(id: number, payload: SalaryTemplatePayload) {
  return request<SalaryTemplate>(`/salary-templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
