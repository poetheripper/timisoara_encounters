'use client';

import { useState } from 'react';

type AccountType = 'user' | 'artist' | 'provider';

const ROLES: { id: AccountType; label: string; description: string }[] = [
  {
    id: 'user',
    label: 'User',
    description: 'Browse, book, and save your favorite artists & services',
  },
  {
    id: 'artist',
    label: 'Artist',
    description: 'Showcase your portfolio, manage gigs, and connect with fans',
  },
  {
    id: 'provider',
    label: 'Provider',
    description: 'Offer venues, equipment, or services to artists and users',
  },
];

export default function RoleLoginCard() {
  const [selectedRole, setSelectedRole] = useState<AccountType>('user');

  const activeRole = ROLES.find((r) => r.id === selectedRole)!;
  const returnTo = encodeURIComponent(`/onboarding?role=${selectedRole}`);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-[18px] font-bold text-gray-900 tracking-tight">
          Welcome
        </h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Choose your account type to continue
        </p>
      </div>

      {/* 3-Option Segmented Selector */}
      <div className="grid grid-cols-3 gap-1.5 w-full bg-gray-100 p-1 rounded-xl">
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              className={`py-2 px-2 rounded-lg text-[13px] font-medium transition-all ${
                isSelected
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {role.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Role Description */}
      <p className="text-[12px] text-gray-500 text-center min-h-[34px] px-2">
        {activeRole.description}
      </p>

      {/* Sign Up & Log In Buttons carrying the chosen role */}
      <div className="w-full flex flex-col gap-2.5 mt-1">
        <a
          href={`/auth/login?screen_hint=signup&returnTo=${returnTo}`}
          className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-[14px] font-medium text-center transition-colors"
        >
          Sign up as {activeRole.label}
        </a>

        <a
          href={`/auth/login?returnTo=${returnTo}`}
          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-[14px] font-medium text-center transition-colors"
        >
          Log in as {activeRole.label}
        </a>
      </div>
    </div>
  );
}