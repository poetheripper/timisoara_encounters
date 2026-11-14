"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch {
    // Storage unavailable (private mode etc.): the theme still applies for this page view.
  }
}

export default function ThemeToggle() {
  // Both icons are rendered and CSS picks one, so there is no state to hydrate.
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Toggle light / dark theme"
      title="Theme"
      onClick={toggleTheme}
    >
      <MoonIcon className="size-5 dark:hidden" />
      <SunIcon className="hidden size-5 dark:block" />
    </Button>
  );
}
