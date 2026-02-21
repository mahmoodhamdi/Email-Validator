"use client";

import { useAdminStore } from "@/stores/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { useTranslations } from "next-intl";

export function AdminReports() {
  const exportLogs = useAdminStore((s) => s.exportLogs);
  const validationLogs = useAdminStore((s) => s.validationLogs);
  const t = useTranslations("admin");

  const handleExport = (format: "json" | "csv") => {
    const data = exportLogs(format);
    const blob = new Blob([data], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-logs.${format}`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: t("exportComplete"),
      description: t("exportCompleteDesc", { format: format.toUpperCase() }),
      variant: "success",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reports")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900">
                  <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("exportJson")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("exportJsonDesc")}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleExport("json")}
                disabled={validationLogs.length === 0}
              >
                <Download className="h-4 w-4 me-2" aria-hidden="true" />
                {t("downloadJson")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full p-2 bg-green-100 dark:bg-green-900">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("exportCsv")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("exportCsvDesc")}
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleExport("csv")}
                disabled={validationLogs.length === 0}
              >
                <Download className="h-4 w-4 me-2" aria-hidden="true" />
                {t("downloadCsv")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-sm text-muted-foreground">
          {t("totalRecords", { count: validationLogs.length })}
        </div>
      </CardContent>
    </Card>
  );
}
