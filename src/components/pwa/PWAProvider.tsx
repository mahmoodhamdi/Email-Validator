"use client";

import { InstallPrompt } from "./InstallPrompt";
import { OfflineIndicator } from "./OfflineIndicator";
import { UpdateAvailable } from "./UpdateAvailable";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineIndicator />
      {children}
      <InstallPrompt />
      <UpdateAvailable />
    </>
  );
}
