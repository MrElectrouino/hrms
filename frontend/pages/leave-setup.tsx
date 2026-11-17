import React from 'react';
import LeaveBalancesPanel from '../components/leave/LeaveBalancesPanel';

/** Administration > Leave balances: an employee's balances, and adding or taking away days (one person, a branch, a country or everyone). */
export default function LeaveBalancesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leave balances</h2>
        <p className="mt-1 text-gray-500">What each employee has, and adding or taking away days. Leave policies, leave types and the leave year are in System settings → Leave configuration.</p>
      </div>
      <LeaveBalancesPanel />
    </div>
  );
}
