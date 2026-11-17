import React from 'react';
import CompOffList from '../../components/leave/CompOffList';

/** Leave Management > My comp off: the comp off the person has earned, and when each runs out. */
export default function MyCompOffPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900">My comp off</h2>
      <CompOffList scope="me" />
    </div>
  );
}
