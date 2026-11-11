import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { getMyMenu, MenuNode } from '../lib/api';
import { UserType } from '../lib/user-types';

const HomeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const DotIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const LogoutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface NavLink {
  href: string;
  label: string;
}

/** Links every signed-in user sees, plus admin screens that must stay reachable before rights are configured. */
const fixedLinks: NavLink[] = [{ href: '/', label: 'Dashboard' }];

const adminLinks: Array<NavLink & { roles: UserType[] }> = [
  { href: '/rights', label: 'Rights', roles: [UserType.SystemAdmin, UserType.HRAdmin] },
  { href: '/menus', label: 'Menus', roles: [UserType.SystemAdmin] },
  { href: '/users', label: 'Users', roles: [UserType.SystemAdmin, UserType.HRAdmin] },
];

/** Flattens the menu tree into links for the active-page label and the sidebar. */
function flattenLinks(nodes: MenuNode[]): NavLink[] {
  return nodes.flatMap((n) => [
    ...(n.pageUrl ? [{ href: n.pageUrl, label: n.name }] : []),
    ...flattenLinks(n.children),
  ]);
}

function NavItem({ link, collapsed, active, onNavigate, icon: Icon = DotIcon, indent = false }: {
  link: NavLink;
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
  icon?: (p: { className?: string }) => JSX.Element;
  indent?: boolean;
}) {
  return (
    <Link href={link.href}>
      <a
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 text-sm font-medium rounded-lg transition-all duration-150 ${
          active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
        } ${collapsed ? 'justify-center px-3 py-2.5' : `py-2.5 ${indent ? 'pl-10 pr-3' : 'px-3'}`}`}
        title={collapsed ? link.label : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-blue-500" />
        )}
        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
        {!collapsed && <span className="truncate">{link.label}</span>}
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg group-hover:opacity-100 transition-opacity z-50">
            {link.label}
          </span>
        )}
      </a>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState<MenuNode[]>([]);

  const mustChangePassword = !!user?.mustChangePassword;

  useEffect(() => {
    if (!isAuthenticated || mustChangePassword) return;
    getMyMenu()
      .then((res) => setMenu(res.data))
      .catch(() => setMenu([]));
  }, [isAuthenticated, mustChangePassword]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && mustChangePassword && router.pathname !== '/change-password') {
      router.replace('/change-password');
    }
  }, [isLoading, isAuthenticated, mustChangePassword, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const isActive = (href: string) => router.pathname === href || router.pathname.startsWith(`${href}/`);
  const navigate = () => setSidebarOpen(false);
  const visibleAdminLinks = adminLinks.filter((l) => user && l.roles.includes(user.userTypeId));
  const activeLabel =
    [...fixedLinks, ...visibleAdminLinks, ...flattenLinks(menu)].find((l) => isActive(l.href))?.label || 'HRMS';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col transform transition-all duration-200 ease-in-out shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden lg:flex absolute -right-3 top-[26px] w-6 h-6 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-blue-600 hover:border-blue-600 shadow-md transition-colors z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon className="w-3.5 h-3.5" /> : <ChevronLeftIcon className="w-3.5 h-3.5" />}
        </button>

        <div className={`h-16 flex items-center shrink-0 border-b border-slate-800/80 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
          <div className="flex items-center min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm">
              <span className="font-bold text-sm">H</span>
            </div>
            {!collapsed && <span className="ml-3 text-xl font-bold tracking-tight truncate">HRMS</span>}
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {fixedLinks.map((link) => (
            <NavItem key={link.href} link={link} collapsed={collapsed} active={isActive(link.href)} onNavigate={navigate} icon={HomeIcon} />
          ))}

          {menu.map((group) => (
            <div key={group.id} className="pt-4">
              {!collapsed && group.children.length > 0 && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.name}</p>
              )}
              {collapsed && group.children.length > 0 && <div className="mx-2 mb-2 border-t border-slate-800" />}
              {group.pageUrl && (
                <NavItem link={{ href: group.pageUrl, label: group.name }} collapsed={collapsed} active={isActive(group.pageUrl)} onNavigate={navigate} />
              )}
              {group.children.map((child) =>
                child.pageUrl ? (
                  <NavItem key={child.id} link={{ href: child.pageUrl, label: child.name }} collapsed={collapsed} active={isActive(child.pageUrl)} onNavigate={navigate} indent={!collapsed} />
                ) : null,
              )}
            </div>
          ))}

          {visibleAdminLinks.length > 0 && (
            <div className="pt-4">
              {!collapsed && <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Administration</p>}
              {collapsed && <div className="mx-2 mb-2 border-t border-slate-800" />}
              {visibleAdminLinks.map((link) => (
                <NavItem key={link.href} link={link} collapsed={collapsed} active={isActive(link.href)} onNavigate={navigate} />
              ))}
            </div>
          )}
        </nav>

        <div className={`border-t border-slate-800/80 p-3 ${collapsed ? 'px-2' : ''}`}>
          <Link href="/account">
            <a
              onClick={navigate}
              className={`flex items-center gap-3 mb-2 rounded-lg transition-colors hover:bg-slate-800 ${collapsed ? 'justify-center py-2' : 'px-2 py-2'}`}
              title={collapsed ? 'My account' : undefined}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-semibold shrink-0 ring-1 ring-slate-600">
                {user?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                  <p className="text-xs text-slate-400 truncate">My account</p>
                </div>
              )}
            </a>
          </Link>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className={`w-full flex items-center justify-center text-sm font-medium text-slate-300 bg-slate-800/80 rounded-lg hover:bg-red-600 hover:text-white transition-colors ${
              collapsed ? 'px-3 py-2.5' : 'px-4 py-2.5 gap-2'
            }`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogoutIcon className="w-4 h-4 shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              aria-label="Open menu"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">{activeLabel}</h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">Modernized HRMS</div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
