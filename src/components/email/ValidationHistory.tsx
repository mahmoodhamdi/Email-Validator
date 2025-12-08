"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHistoryStore } from "@/stores/history-store";
import { formatDate } from "@/lib/utils";

interface ValidationHistoryProps {
  onRevalidate?: (email: string) => void;
}

export function ValidationHistory({ onRevalidate }: ValidationHistoryProps) {
  const { items, removeItem, clearHistory } = useHistoryStore();

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Validation History
          </CardTitle>
          <CardDescription>
            Your recent email validations will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mb-4 opacity-50" />
            <p>No validation history yet</p>
            <p className="text-sm">Start validating emails to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Validation History
            </CardTitle>
            <CardDescription>
              {items.length} validation{items.length !== 1 ? "s" : ""} stored locally
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.isValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      item.score >= 80
                        ? "success"
                        : item.score >= 50
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {item.score}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onRevalidate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRevalidate(item.email)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
