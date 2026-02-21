"use client";

import { useAdminStore } from "@/stores/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function SystemConfig() {
  const config = useAdminStore((s) => s.config);
  const updateConfig = useAdminStore((s) => s.updateConfig);
  const resetConfig = useAdminStore((s) => s.resetConfig);
  const t = useTranslations("admin");

  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    updateConfig(localConfig);
    toast({
      title: t("configSaved"),
      description: t("configSavedDesc"),
      variant: "success",
    });
  };

  const handleReset = () => {
    resetConfig();
    setLocalConfig({
      rateLimitMax: 100,
      rateLimitWindow: 60000,
      smtpTimeout: 10000,
      cacheTtl: 300000,
      maxBulkSize: 1000,
    });
    toast({
      title: t("configReset"),
      description: t("configResetDesc"),
      variant: "success",
    });
  };

  const fields = [
    {
      key: "rateLimitMax" as const,
      label: t("rateLimitMax"),
      description: t("rateLimitMaxDesc"),
      min: 1,
      max: 10000,
    },
    {
      key: "rateLimitWindow" as const,
      label: t("rateLimitWindow"),
      description: t("rateLimitWindowDesc"),
      min: 1000,
      max: 3600000,
    },
    {
      key: "smtpTimeout" as const,
      label: t("smtpTimeout"),
      description: t("smtpTimeoutDesc"),
      min: 1000,
      max: 60000,
    },
    {
      key: "cacheTtl" as const,
      label: t("cacheTtl"),
      description: t("cacheTtlDesc"),
      min: 0,
      max: 3600000,
    },
    {
      key: "maxBulkSize" as const,
      label: t("maxBulkSize"),
      description: t("maxBulkSizeDesc"),
      min: 1,
      max: 10000,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("systemConfig")}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 me-1" aria-hidden="true" />
              {t("resetDefaults")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 me-1" aria-hidden="true" />
              {t("saveConfig")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type="number"
                min={field.min}
                max={field.max}
                value={localConfig[field.key]}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    [field.key]: parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {field.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
