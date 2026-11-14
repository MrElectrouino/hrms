import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { DashboardSummary, getDashboard } from '../lib/dashboard-api';

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

const Card = ({ title, children, href, cta }: { title: string; children: React.ReactNode; href?: string; cta?: string }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {href && <Link href={href} className="text-sm font-medium text-blue-600 hover:text-blue-800">{cta ?? 'Open'}</Link>}
    </div>
    <div className="mt-3">{children}</div>
  </section>
);

const Stat = ({ label, value, href, tone = 'text-gray-900' }: { label: string; value: number | string; href?: string; tone?: string }) => {
  const body = (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
};

/** Home page: what matters today for this person, from live records. */
export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getDashboard().then((r) => setData(r.data)).catch((e: any) => setError(e.message || 'Could not load the dashboard'));
  }, [isAuthenticated]);

  const { mine, team, hr } = data ?? { mine: null, team: null, hr: null };
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hello{user?.username ? `, ${user.username}` : ''}</h2>
        <p className="mt-1 text-gray-500">{today}</p>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {!data && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {mine && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="My day" href="/attendance/mark" cta={mine.attendance?.firstInAt ? 'Open attendance' : 'Mark attendance'}>
            {mine.attendance ? (
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-medium text-gray-900">{mine.attendance.statusName}</span>{mine.attendance.lateMinutes > 0 && <span className="ml-2 text-amber-700">{mine.attendance.lateMinutes} min late</span>}</p>
                <p>In <b>{time(mine.attendance.firstInAt)}</b> · Out <b>{time(mine.attendance.lastOutAt)}</b></p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">You have not marked attendance today.</p>
            )}
          </Card>
          <Card title="My leave" href="/leave/my" cta="Apply or view">
            {mine.balances.length === 0 ? (
              <p className="text-sm text-gray-500">No leave balance yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mine.balances.map((b) => (
                  <span key={b.leaveTypeId} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">{b.name}: <b className="text-gray-900">{b.balance}</b></span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500">
              {mine.pendingLeave > 0 ? `${mine.pendingLeave} request${mine.pendingLeave === 1 ? '' : 's'} waiting for approval. ` : ''}
              {mine.nextLeave ? `Next leave: ${mine.nextLeave.type}, ${mine.nextLeave.from}${mine.nextLeave.to !== mine.nextLeave.from ? ` to ${mine.nextLeave.to}` : ''}.` : ''}
            </p>
          </Card>
        </div>
      )}

      {team && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900">{hr ? 'Everyone today' : 'My team today'}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Present" value={team.present} href="/attendance/team" tone="text-green-700" />
            <Stat label="On leave" value={team.onLeave} href="/leave/team" />
            <Stat label="Not yet in" value={team.notYetIn} href="/attendance/team" tone={team.notYetIn ? 'text-amber-700' : undefined} />
            <Stat label="Late" value={team.late} href="/attendance/team" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Leave waiting for you" value={team.leaveWaiting} href="/leave/team" tone={team.leaveWaiting ? 'text-blue-700' : undefined} />
            <Stat label="Corrections waiting" value={team.correctionsWaiting} href="/attendance/corrections" tone={team.correctionsWaiting ? 'text-blue-700' : undefined} />
            <Stat label="Days to approve" value={team.attendanceToApprove} href="/attendance/team" />
          </div>
        </section>
      )}

      {hr && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900">Documents</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Expired" value={hr.documentsExpired} href="/documents" tone={hr.documentsExpired ? 'text-red-700' : undefined} />
            <Stat label="Expiring in 30 days" value={hr.documentsExpiring} href="/documents" tone={hr.documentsExpiring ? 'text-amber-700' : undefined} />
          </div>
        </section>
      )}

      {data && !mine && !team && !hr && <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Your account is not linked to an employee record, so there is nothing to show yet.</p>}
    </div>
  );
}
