import { request, MenuFlags } from './api';

// ---- Menu items (menu management) -----------------------------------------

export interface MenuItemRow {
  id: number;
  parentId: number | null;
  name: string;
  pageUrl: string | null;
  iconClass: string | null;
  displayOrder: number;
  isMainMenu: boolean;
  isActive: boolean;
}

export interface MenuItemPayload {
  name: string;
  pageUrl?: string | null;
  iconClass?: string | null;
  displayOrder: number;
  parentId?: number | null;
  isMainMenu?: boolean;
  isActive?: boolean;
}

export function getMenuItems() {
  return request<MenuItemRow[]>('/rbac/menu-items');
}

export function createMenuItem(payload: MenuItemPayload) {
  return request<MenuItemRow>('/rbac/menu-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMenuItem(id: number, payload: Partial<MenuItemPayload>) {
  return request<MenuItemRow>(`/rbac/menu-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---- Rights by user type ---------------------------------------------------

export interface MenuPermissionRow extends MenuFlags {
  menuItemId: number;
  pageUrlOverride: string | null;
}

export function getMenuPermissions(userTypeId: number) {
  return request<MenuPermissionRow[]>(`/rbac/menu-permissions/${userTypeId}`);
}

export function setMenuPermissions(userTypeId: number, permissions: MenuPermissionRow[]) {
  return request<MenuPermissionRow[]>(`/rbac/menu-permissions/${userTypeId}`, {
    method: 'PUT',
    body: JSON.stringify({
      permissions: permissions.map((p) => ({
        menuItemId: p.menuItemId,
        isCreate: p.isCreate,
        isEdit: p.isEdit,
        isDelete: p.isDelete,
      })),
    }),
  });
}

// ---- Account: current user, password, sessions ----------------------------

export interface CurrentUser {
  id: number;
  username: string;
  userTypeId: number;
  profileId: number;
  mustChangePassword: boolean;
  userType: { name: string };
  profile: { name: string; lastName?: string | null; email?: string | null; employee: { id: number } | null };
}

export function getMe() {
  return request<CurrentUser>('/auth/me');
}

export function changeOwnPassword(currentPassword: string, newPassword: string) {
  return request<null>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export interface SessionRow {
  id: string;
  issuedAt: string;
  lastUsedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export function getSessions() {
  return request<SessionRow[]>('/auth/sessions');
}

export function revokeSession(id: string) {
  return request<{ revoked: boolean }>(`/auth/sessions/${id}`, { method: 'DELETE' });
}

export function revokeOtherSessions() {
  return request<{ revoked: number }>('/auth/sessions/revoke-others', { method: 'POST' });
}
