"use client";

import { useAdminStore } from "@/stores/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminOverview() {
  const getOverviewStats = useAdminStore((s) => s.getOverviewStats);
  const t = useTranslations("admin");
  const stats = getOverviewStats();

  const cards = [
    {
      title: t("totalValidationsToday"),
      value: stats.totalValidationsToday.toLocaleString(),
      icon: Activity,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900",
    },
    {
      title: t("successRate"),
      value: `${stats.successRate}%`,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900",
    },
    {
      title: t("avgResponseTime"),
      value: `${stats.avgResponseTime}ms`,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900",
    },
    {
      title: t("securityEvents"),
      value: stats.totalSecurityEvents.toLocaleString(),
      icon: ShieldAlert,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="region" aria-label={t("overview")}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
