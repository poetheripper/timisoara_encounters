"use client";

import Image from "next/image";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Menu } from "@base-ui/react/menu";
import { LogOutIcon, MapIcon, MenuIcon, SearchIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import RoleLoginCard from "@/components/RoleLoginCard";
import ThemeToggle from "@/components/ThemeToggle";
import logo from "@/app/onboarding/assets/homepage_logo.svg";
import logoWhite from "@/app/onboarding/assets/homepage_logo_white.svg";

const MENU_POPUP_CLASS =
  "min-w-48 rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none";
const MENU_ITEM_CLASS =
  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none select-none data-highlighted:bg-muted";

function AccountButton() {
  const { user, isLoading } = useUser();

  // Signed in: the only account action for now is logging out.
  if (user) {
    return (
      <Menu.Root>
        <Menu.Trigger
          render={<Button variant="ghost" size="icon-lg" aria-label="Account" title="Account" />}
        >
          <UserIcon className="size-5 sm:size-6" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
            <Menu.Popup className={MENU_POPUP_CLASS}>
              {/* Plain <a>: /auth/logout is an Auth0 route and must be a full navigation, never prefetched. */}
              <Menu.LinkItem href="/auth/logout" className={MENU_ITEM_CLASS}>
                <LogOutIcon className="size-4" />
                Log out
              </Menu.LinkItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    );
  }

  // Signed out: the icon opens the sign up / log in dialog.

  return (
    <RoleLoginCard
      trigger={
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Log in or sign up"
          title="Account"
          disabled={isLoading}
        >
          <UserIcon className="size-5 sm:size-6" />
        </Button>
      }
    />
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between gap-2 px-3 sm:h-20 sm:px-6">
        <Link href="/" aria-label="Timișoara Encounters home" className="flex shrink-0 items-center">
          <Image
            src={logo}
            alt="Timișoara Encounters"
            priority
            className="h-10 w-auto sm:h-14 dark:hidden"
          />
          <Image
            src={logoWhite}
            alt="Timișoara Encounters"
            priority
            className="hidden h-10 w-auto sm:h-14 dark:block"
          />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2">
          <Button
            nativeButton={false}
            variant="ghost"
            size="icon-lg"
            aria-label="Search"
            title="Search"
            render={<Link href="/search" />}
          >
            <SearchIcon className="size-5 sm:size-6" />
          </Button>

          <Button
            nativeButton={false}
            variant="ghost"
            size="icon-lg"
            aria-label="Map"
            title="Map"
            render={<Link href="/map" />}
          >
            <MapIcon className="size-5 sm:size-6" />
          </Button>

          <AccountButton />

          <ThemeToggle />

          <Menu.Root>
            <Menu.Trigger
              render={
                <Button variant="ghost" size="icon-lg" aria-label="Open menu" title="Menu" />
              }
            >
              <MenuIcon className="size-5 sm:size-6" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
                <Menu.Popup className={MENU_POPUP_CLASS}>
                  <Menu.LinkItem
                    render={<Link href="/account/settings" />}
                    className={MENU_ITEM_CLASS}
                  >
                    <SettingsIcon className="size-4" />
                    Account settings
                  </Menu.LinkItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </nav>
      </div>
    </header>
  );
}
