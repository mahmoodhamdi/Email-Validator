"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export function UpdateAvailable() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  const checkForUpdates = useCallback((reg: ServiceWorkerRegistration) => {
    reg.update();
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setShowUpdate(true);
              }
            });
          }
        });
      });

      // Check for updates every hour
      const interval = setInterval(() => {
        navigator.serviceWorker.ready.then((reg) => {
          checkForUpdates(reg);
        });
      }, 60 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [checkForUpdates]);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Update Available</p>
              <p className="text-sm text-muted-foreground">
                A new version is ready
              </p>
            </div>
            <Button size="sm" onClick={handleUpdate}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
