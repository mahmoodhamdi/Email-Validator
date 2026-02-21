"use client";

import { useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function ValidationLogsTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const validationLogs = useAdminStore((s) => s.validationLogs);
  const clearValidationLogs = useAdminStore((s) => s.clearValidationLogs);
  const t = useTranslations("admin");

  const filtered = validationLogs.filter((log) =>
    log.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "deliverable":
        return "success" as const;
      case "risky":
        return "warning" as const;
      case "undeliverable":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const getRiskVariant = (risk: string) => {
    switch (risk) {
      case "low":
        return "success" as const;
      case "medium":
        return "warning" as const;
      case "high":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("validationLogs")}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder={t("searchEmails")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-8 w-64"
                aria-label={t("searchEmails")}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearValidationLogs}
              aria-label={t("clearLogs")}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {paginated.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("noLogs")}
          </p>
        ) : (
          <>
            <Table role="table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("score")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("risk")}</TableHead>
                  <TableHead>{t("responseTime")}</TableHead>
                  <TableHead>{t("timestamp")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                      {log.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          log.score >= 80
                            ? "text-green-600 dark:text-green-400 font-semibold"
                            : log.score >= 50
                            ? "text-yellow-600 dark:text-yellow-400 font-semibold"
                            : "text-red-600 dark:text-red-400 font-semibold"
                        }
                      >
                        {log.score}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRiskVariant(log.risk)}>
                        {log.risk}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.responseTimeMs}ms</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {t("showingResults", {
                  start: page * pageSize + 1,
                  end: Math.min((page + 1) * pageSize, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  {t("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
