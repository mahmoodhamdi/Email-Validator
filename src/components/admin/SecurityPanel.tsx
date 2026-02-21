"use client";

import { useAdminStore } from "@/stores/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldAlert, ShieldBan, ShieldX, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export function SecurityPanel() {
  const securityEvents = useAdminStore((s) => s.securityEvents);
  const clearSecurityEvents = useAdminStore((s) => s.clearSecurityEvents);
  const t = useTranslations("admin");

  const getEventIcon = (type: string) => {
    switch (type) {
      case "rate_limit":
        return ShieldAlert;
      case "blocked_ip":
        return ShieldBan;
      case "auth_failure":
        return ShieldX;
      default:
        return AlertTriangle;
    }
  };

  const getEventVariant = (type: string) => {
    switch (type) {
      case "rate_limit":
        return "warning" as const;
      case "blocked_ip":
        return "destructive" as const;
      case "auth_failure":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("securityEvents")}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSecurityEvents}
            aria-label={t("clearEvents")}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {securityEvents.length === 0 ? (
          <div className="text-center py-8">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-2" aria-hidden="true" />
            <p className="text-muted-foreground">{t("noSecurityEvents")}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {securityEvents.slice(0, 50).map((event) => {
              const Icon = getEventIcon(event.type);
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getEventVariant(event.type)}>
                        {event.type.replace("_", " ")}
                      </Badge>
                      {event.ip && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {event.ip}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{event.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
