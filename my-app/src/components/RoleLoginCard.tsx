'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

type AccountType = 'user' | 'artist' | 'venue';

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
    id: 'venue',
    label: 'Venue',
    description: 'Offer venues, equipment, or services to artists and users',
  },
];

export default function RoleLoginCard() {
  const [selectedRole, setSelectedRole] = useState<AccountType>('user');

  const activeRole = ROLES.find((r) => r.id === selectedRole)!;
  const returnTo = encodeURIComponent(`/onboarding?role=${selectedRole}`);

  return (
    <Dialog defaultOpen={true}>
      <DialogContent className="sm:max-w-[380px] rounded-[28px] p-8">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Welcome!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose your account type to continue
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-2">
          {/* shadcn 3-Option Segmented Selector */}
          <Tabs
            value={selectedRole}
            onValueChange={(val) => setSelectedRole(val as AccountType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-xl">
              {ROLES.map((role) => (
                <TabsTrigger key={role.id} value={role.id} className="rounded-lg">
                  {role.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Dynamic Description */}
          <p className="text-xs text-muted-foreground text-center min-h-[32px] px-2">
            {activeRole.description}
          </p>

          {/* shadcn Buttons */}
        <div className="w-full flex flex-col gap-2.5">
            <Button
              render={<a href={`/auth/login?screen_hint=signup&returnTo=${returnTo}`} />}
              className="w-full rounded-xl h-11">
            Sign up as {activeRole.label}
          </Button>

          <Button
              variant="outline"
              render={<a href={`/auth/login?returnTo=${returnTo}`} />}
              className="w-full rounded-xl h-11">
               Log in as {activeRole.label}
          </Button>
        </div>

          {/* Powered by Auth0 footer inside the pop-up */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2">
            <span>Powered by</span>
            <img
              src="https://cdn.auth0.com/quantum-assets/dist/latest/logos/auth0/auth0-lockup-en-onlight.svg"
              alt="Auth0"
              className="h-3 opacity-50"
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}