import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { UserType } from '../lib/user-types';
import RightsPanel from '../components/RightsPanel';
import MenusPanel from '../components/MenusPanel';

type Tab = 'rights' | 'menus';

/** Menus (the navigation tree) and Rights (what each role may do on them), in one place. */
export default function AccessControlPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSystemAdmin = user?.userTypeId === UserType.SystemAdmin;
  const [tab, setTab] = useState<Tab>('rights');

  // Deep links and the old /rights and /menus URLs arrive as ?tab=…
  useEffect(() => {
    const q = router.query.tab;
    if (q === 'menus' || q === 'rights') setTab(q);
  }, [router.query.tab]);

  const choose = (t: Tab) => {
    setTab(t);
    router.replace({ pathname: '/access-control', query: { tab: t } }, undefined, { shallow: true });
  };

  const tabs: { key: Tab; label: string; hint: string }[] = [
    { key: 'rights', label: 'Rights', hint: 'What each role can see and do' },
    ...(isSystemAdmin ? [{ key: 'menus' as Tab, label: 'Menus', hint: 'The navigation items themselves' }] : []),
  ];
  const active = tabs.some((t) => t.key === tab) ? tab : 'rights';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Menus &amp; rights</h2>
        <p className="mt-1 text-gray-500">Define the menu items, then choose which roles see them and can create, edit or delete.</p>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            type="button"
            onClick={() => choose(t.key)}
            title={t.hint}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${active === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'rights' ? <RightsPanel /> : <MenusPanel />}
    </div>
  );
}
