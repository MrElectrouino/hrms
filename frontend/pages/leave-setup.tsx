import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LeavePoliciesPanel from '../components/leave/LeavePoliciesPanel';
import LeaveBalancesPanel from '../components/leave/LeaveBalancesPanel';

type Tab = 'policies' | 'balances';

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'policies', label: 'Policies', hint: 'Who gets how many days of each leave type, and how they are worked out' },
  { key: 'balances', label: 'Balances', hint: "Employees' balances, and adding or taking away days" },
];

/** Administration > Leave setup: leave policies and employee balances in one place. */
export default function LeaveSetupPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('policies');

  // Deep links arrive as ?tab=…
  useEffect(() => {
    const q = router.query.tab;
    if (TABS.some((t) => t.key === q)) setTab(q as Tab);
  }, [router.query.tab]);

  const choose = (t: Tab) => {
    setTab(t);
    router.replace({ pathname: '/leave-setup', query: { tab: t } }, undefined, { shallow: true });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leave setup</h2>
        <p className="mt-1 text-gray-500">Leave policies say how many days people get. Balances show what each employee has and let HR add or take away days. Leave types and the leave year are in System settings.</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            type="button"
            onClick={() => choose(t.key)}
            title={t.hint}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'policies' && <LeavePoliciesPanel />}
      {tab === 'balances' && <LeaveBalancesPanel />}
    </div>
  );
}
