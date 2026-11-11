import React from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';

export default function ChangePasswordPage() {
  return (
    <div className="max-w-md">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Set a new password</h2>
        <ChangePasswordForm forced />
      </div>
    </div>
  );
}
