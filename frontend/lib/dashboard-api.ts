import { request } from './api';

export interface MineToday {
  attendance: { statusName: string; isPresent: boolean; firstInAt: string | null; lastOutAt: string | null; lateMinutes: number } | null;
  balances: { leaveTypeId: number; name: string; balance: number }[];
  pendingLeave: number;
  nextLeave: { type: string; from: string; to: string; days: number } | null;
  date: string;
}
export interface TeamToday {
  total: number;
  /** On a weekly off or holiday today and not in: not expected, so left out of the rate. */
  offToday: number;
  present: number;
  late: number;
  onLeave: number;
  notYetIn: number;
  leaveWaiting: number;
  correctionsWaiting: number;
  attendanceToApprove: number;
  date: string;
}
export interface DashboardSummary {
  today: string;
  role: 'HR' | 'MANAGER' | 'EMPLOYEE';
  mine: MineToday | null;
  team: TeamToday | null;
  hr: { documentsExpired: number; documentsExpiring: number } | null;
  charts: { headcount: { month: string; count: number }[]; departments: { name: string; count: number }[] } | null;
}
export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  at: string;
}

export const getDashboard = () => request<DashboardSummary>('/dashboard');
export const getNotifications = () => request<NotificationItem[]>('/dashboard/notifications');
