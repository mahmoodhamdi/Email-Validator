"use client";

import { useState } from "react";
import { mergeEmailLists, MergeResult } from "@/lib/cleaning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Merge, Download, Copy } from "lucide-react";

export function ListMerger() {
  const [lists, setLists] = useState<string[]>(["", ""]);
  const [result, setResult] = useState<MergeResult | null>(null);

  const addList = () => {
    setLists((prev) => [...prev, ""]);
  };

  const removeList = (index: number) => {
    if (lists.length > 2) {
      setLists((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateList = (index: number, value: string) => {
    setLists((prev) => prev.map((list, i) => (i === index ? value : list)));
  };

  const getEmailCount = (list: string) => {
    return list
      .split("\n")
      .map((e) => e.trim())
      .filter(Boolean).length;
  };

  const handleMerge = () => {
    const parsedLists = lists.map((list) =>
      list
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean)
    );

    const mergeResult = mergeEmailLists(parsedLists);
    setResult(mergeResult);
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.merged.join("\n"));
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result.merged.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged-emails.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const totalEmails = lists.reduce((acc, list) => acc + getEmailCount(list), 0);

  return (
    <div className="space-y-4">
      {/* Input Lists */}
      {lists.map((list, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              List {index + 1}
            </CardTitle>
            {lists.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeList(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Textarea
              value={list}
              onChange={(e) => updateList(index, e.target.value)}
              placeholder="Paste emails (one per line)"
              rows={5}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {getEmailCount(list)} emails
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={addList}>
          <Plus className="h-4 w-4 mr-2" />
          Add List
        </Button>
        <Button onClick={handleMerge} disabled={totalEmails === 0}>
          <Merge className="h-4 w-4 mr-2" />
          Merge Lists
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Merged Result</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">
                {result.stats.listsCount} lists merged
              </Badge>
              <Badge variant="outline">
                {result.stats.totalOriginal} total emails
              </Badge>
              <Badge variant="secondary">
                {result.stats.totalMerged} unique emails
              </Badge>
              {result.stats.duplicatesRemoved > 0 && (
                <Badge variant="destructive">
                  {result.stats.duplicatesRemoved} duplicates removed
                </Badge>
              )}
            </div>

            <Textarea
              value={result.merged.join("\n")}
              readOnly
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
