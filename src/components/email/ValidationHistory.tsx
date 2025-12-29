"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHistoryStore } from "@/stores/history-store";
import { formatDate, downloadFile } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import type { HistoryItem } from "@/types/email";

// Filter types
type ValidityFilter = "all" | "valid" | "invalid";
type RiskFilter = "all" | "low" | "medium" | "high";
type SortBy = "date" | "score" | "email";
type SortOrder = "asc" | "desc";

interface FilterState {
  search: string;
  validity: ValidityFilter;
  risk: RiskFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

const ITEMS_PER_PAGE = 20;

interface ValidationHistoryProps {
  onRevalidate?: (email: string) => void;
}

export function ValidationHistory({ onRevalidate }: ValidationHistoryProps) {
  const { items, removeItem, clearHistory } = useHistoryStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    validity: "all",
    risk: "all",
    sortBy: "date",
    sortOrder: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (item) =>
          item.email.toLowerCase().includes(query) ||
          item.email.split("@")[1]?.toLowerCase().includes(query)
      );
    }

    // Validity filter
    if (filters.validity !== "all") {
      result = result.filter((item) =>
        filters.validity === "valid" ? item.isValid : !item.isValid
      );
    }

    // Risk filter
    if (filters.risk !== "all") {
      result = result.filter((item) => item.risk === filters.risk);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === "date") {
        comparison =
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (filters.sortBy === "score") {
        comparison = b.score - a.score;
      } else {
        comparison = a.email.localeCompare(b.email);
      }
      return filters.sortOrder === "desc" ? comparison : -comparison;
    });

    return result;
  }, [items, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Reset page when filters change
  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    []
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      validity: "all",
      risk: "all",
      sortBy: "date",
      sortOrder: "desc",
    });
    setCurrentPage(1);
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    filters.search ||
    filters.validity !== "all" ||
    filters.risk !== "all" ||
    filters.sortBy !== "date" ||
    filters.sortOrder !== "desc";

  // Export functions
  const handleExportCSV = useCallback(() => {
    if (filteredItems.length === 0) {
      toast({
        title: "No items to export",
        description: "Apply different filters or add validation history.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Email", "Valid", "Score", "Risk", "Deliverability", "Date"];
    const rows = filteredItems.map((item) => [
      item.email,
      item.isValid ? "Yes" : "No",
      item.score.toString(),
      item.risk,
      item.deliverability,
      new Date(item.timestamp).toISOString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    downloadFile(csv, "validation-history.csv", "text/csv");
    toast({
      title: "Exported to CSV",
      description: `${filteredItems.length} items exported`,
      variant: "success",
    });
  }, [filteredItems]);

  const handleExportJSON = useCallback(() => {
    if (filteredItems.length === 0) {
      toast({
        title: "No items to export",
        description: "Apply different filters or add validation history.",
        variant: "destructive",
      });
      return;
    }

    downloadFile(
      JSON.stringify(filteredItems, null, 2),
      "validation-history.json",
      "application/json"
    );
    toast({
      title: "Exported to JSON",
      description: `${filteredItems.length} items exported`,
      variant: "success",
    });
  }, [filteredItems]);

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  }, []);

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Validation History
            </CardTitle>
            <CardDescription>
              {filteredItems.length} of {items.length} validation
              {items.length !== 1 ? "s" : ""} shown
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
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
        </div>

        {/* Search and Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 p-4 bg-muted/50 rounded-lg">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or domain..."
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-4 flex-wrap">
                  {/* Validity Filter */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Validity</label>
                    <Select
                      value={filters.validity}
                      onValueChange={(v) => updateFilter("validity", v as ValidityFilter)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="valid">Valid</SelectItem>
                        <SelectItem value="invalid">Invalid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Risk Filter */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Risk Level</label>
                    <Select
                      value={filters.risk}
                      onValueChange={(v) => updateFilter("risk", v as RiskFilter)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Sort By</label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(v) => updateFilter("sortBy", v as SortBy)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="score">Score</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Order</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSortOrder}
                      className="w-[100px]"
                    >
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      {filters.sortOrder === "desc" ? "Desc" : "Asc"}
                    </Button>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">&nbsp;</label>
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent>
        {/* No results message */}
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p>No results match your filters</p>
            <Button variant="link" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}

        {/* Results list */}
        {filteredItems.length > 0 && (
          <>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {paginatedItems.map((item, index) => (
                  <HistoryItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onRevalidate={onRevalidate}
                    onRemove={removeItem}
                    searchQuery={filters.search}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Separate component for history item to optimize re-renders
interface HistoryItemRowProps {
  item: HistoryItem;
  index: number;
  onRevalidate?: (email: string) => void;
  onRemove: (id: string) => void;
  searchQuery: string;
}

function HistoryItemRow({
  item,
  index,
  onRevalidate,
  onRemove,
  searchQuery,
}: HistoryItemRowProps) {
  // Highlight search matches
  const highlightMatch = (text: string) => {
    if (!searchQuery) {
      return text;
    }
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div
      layout
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
          <p className="truncate text-sm font-medium">
            {highlightMatch(item.email)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(item.timestamp)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={
            item.risk === "low"
              ? "success"
              : item.risk === "medium"
              ? "warning"
              : "destructive"
          }
          className="hidden sm:inline-flex"
        >
          {item.risk}
        </Badge>
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
              title="Revalidate"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
