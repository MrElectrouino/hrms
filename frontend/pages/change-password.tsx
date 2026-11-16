import React from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';

/** Forced screen after an administrator set or reset a password: choose your own before continuing. */
export default function ChangePasswordPage() {
  return (
    <div className="mx-auto w-full max-w-lg py-6 sm:py-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Set a new password</h2>
            <p className="mt-1 text-sm text-gray-500">Enter the password you were given, then choose one only you know.</p>
          </div>
        </div>
        <ChangePasswordForm forced />
      </div>
    </div>
  );
}
