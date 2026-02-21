"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { ValidationLogsTable } from "@/components/admin/ValidationLogsTable";
import { SystemConfig } from "@/components/admin/SystemConfig";
import { SecurityPanel } from "@/components/admin/SecurityPanel";
import { AdminReports } from "@/components/admin/AdminReports";
import { Shield } from "lucide-react";

export default function AdminPage() {
  const t = useTranslations("admin");

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <AdminOverview />

      <Tabs defaultValue="logs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="logs">{t("tabLogs")}</TabsTrigger>
          <TabsTrigger value="config">{t("tabConfig")}</TabsTrigger>
          <TabsTrigger value="security">{t("tabSecurity")}</TabsTrigger>
          <TabsTrigger value="reports">{t("tabReports")}</TabsTrigger>
        </TabsList>
        <TabsContent value="logs">
          <ValidationLogsTable />
        </TabsContent>
        <TabsContent value="config">
          <SystemConfig />
        </TabsContent>
        <TabsContent value="security">
          <SecurityPanel />
        </TabsContent>
        <TabsContent value="reports">
          <AdminReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
