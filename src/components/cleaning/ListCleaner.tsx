"use client";

import { useState, useMemo } from "react";
import {
  cleanEmailList,
  findDuplicates,
  groupByDomain,
  CleaningOptions,
  CleaningResult,
} from "@/lib/cleaning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Download, ArrowRight, Wand2 } from "lucide-react";

interface ListCleanerProps {
  initialEmails?: string[];
  onCleaned?: (emails: string[]) => void;
}

const OPTION_LABELS: Record<keyof CleaningOptions, string> = {
  removeDuplicates: "Remove Duplicates",
  normalizeCase: "Normalize Case",
  trimWhitespace: "Trim Whitespace",
  removeInvalidSyntax: "Remove Invalid",
  removeEmpty: "Remove Empty",
  sortAlphabetically: "Sort A-Z",
  groupByDomain: "Group by Domain",
};

export function ListCleaner({
  initialEmails = [],
  onCleaned,
}: ListCleanerProps) {
  const [input, setInput] = useState(initialEmails.join("\n"));
  const [options, setOptions] = useState<CleaningOptions>({
    removeDuplicates: true,
    normalizeCase: true,
    trimWhitespace: true,
    removeInvalidSyntax: true,
    removeEmpty: true,
    sortAlphabetically: false,
    groupByDomain: false,
  });
  const [result, setResult] = useState<CleaningResult | null>(null);
  const [activeTab, setActiveTab] = useState("preview");

  const emails = useMemo(() => {
    return input
      .split("\n")
      .map((e) => e.trim())
      .filter(Boolean);
  }, [input]);

  const duplicates = useMemo(() => findDuplicates(emails), [emails]);

  const handleClean = () => {
    const cleanResult = cleanEmailList(emails, options);
    setResult(cleanResult);
    setActiveTab("preview");
  };

  const handleApply = () => {
    if (result) {
      setInput(result.cleaned.join("\n"));
      onCleaned?.(result.cleaned);
      setResult(null);
      setActiveTab("preview");
    }
  };

  const handleCopy = () => {
    const textToCopy = result ? result.cleaned.join("\n") : input;
    navigator.clipboard.writeText(textToCopy);
  };

  const handleDownload = () => {
    const textToDownload = result ? result.cleaned.join("\n") : input;
    const blob = new Blob([textToDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned-emails.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle>Email List</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste emails here (one per line)"
            rows={10}
            className="font-mono text-sm"
          />
          <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
            <span>{emails.length} emails</span>
            {duplicates.size > 0 && (
              <Badge variant="destructive">
                {duplicates.size} duplicates found
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle>Cleaning Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(Object.keys(options) as Array<keyof CleaningOptions>).map(
              (key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={options[key]}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, [key]: !!checked }))
                    }
                  />
                  <span className="text-sm">{OPTION_LABELS[key]}</span>
                </label>
              )
            )}
          </div>

          <Button onClick={handleClean} className="mt-4" disabled={emails.length === 0}>
            <Wand2 className="h-4 w-4 mr-2" />
            Clean List
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Results</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button size="sm" onClick={handleApply}>
                  Apply Changes
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">
                  {result.stats.originalCount}
                </div>
                <div className="text-xs text-muted-foreground">Original</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.cleanedCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  After Cleaning
                </div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {result.stats.duplicatesRemoved}
                </div>
                <div className="text-xs text-muted-foreground">
                  Duplicates Removed
                </div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {result.stats.invalidRemoved}
                </div>
                <div className="text-xs text-muted-foreground">
                  Invalid Removed
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="changes">
                  Changes ({result.changes.length})
                </TabsTrigger>
                <TabsTrigger value="domains">By Domain</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-4">
                <Textarea
                  value={result.cleaned.join("\n")}
                  readOnly
                  rows={10}
                  className="font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="changes" className="mt-4">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {result.changes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No changes were made to the list.
                    </p>
                  ) : (
                    result.changes.map((change, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm p-2 bg-muted rounded"
                      >
                        <Badge variant="outline">{change.type.replace(/_/g, " ")}</Badge>
                        {change.original && change.cleaned && (
                          <>
                            <span className="line-through text-muted-foreground truncate max-w-[150px]">
                              {change.original}
                            </span>
                            <ArrowRight className="h-3 w-3 flex-shrink-0" />
                            <span className="text-green-600 truncate max-w-[150px]">
                              {change.cleaned}
                            </span>
                          </>
                        )}
                        {change.count && (
                          <span className="text-muted-foreground">
                            ({change.count} items)
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="domains" className="mt-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Array.from(groupByDomain(result.cleaned))
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([domain, domainEmails]) => (
                      <div key={domain} className="p-2 bg-muted rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{domain}</span>
                          <Badge>{domainEmails.length}</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
