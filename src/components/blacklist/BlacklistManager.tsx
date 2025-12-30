'use client';

import { useState } from 'react';
import { useBlacklistStore } from '@/stores/blacklist-store';
import { validatePattern } from '@/lib/blacklist';
import type { BlacklistEntry } from '@/lib/blacklist/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  X,
  Check,
  List,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';

export function BlacklistManager() {
  const {
    blacklists,
    activeBlacklistId,
    createBlacklist,
    deleteBlacklist,
    addEntry,
    removeEntry,
    toggleEntry,
    exportBlacklists,
    importBlacklists,
    setActiveBlacklist,
  } = useBlacklistStore();

  const [newListName, setNewListName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newPatternType, setNewPatternType] = useState<BlacklistEntry['type']>('domain');
  const [error, setError] = useState('');

  const activeBlacklist = blacklists.find((bl) => bl.id === activeBlacklistId);

  const handleCreateList = () => {
    if (!newListName.trim()) {
      setError('Please enter a blacklist name');
      return;
    }
    const newList = createBlacklist(newListName.trim());
    setActiveBlacklist(newList.id);
    setNewListName('');
    setError('');
    toast({
      title: 'Blacklist created',
      description: `Created "${newList.name}"`,
      variant: 'success',
    });
  };

  const handleAddEntry = () => {
    if (!activeBlacklistId || !newPattern.trim()) {
      setError('Please enter a pattern');
      return;
    }

    const validation = validatePattern(newPattern, newPatternType);
    if (!validation.valid) {
      setError(validation.error || 'Invalid pattern');
      return;
    }

    addEntry(activeBlacklistId, {
      pattern: newPattern.trim().toLowerCase(),
      type: newPatternType,
      isActive: true,
    });

    setNewPattern('');
    setError('');
  };

  const handleExport = () => {
    const json = exportBlacklists();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blacklists-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Export successful',
      description: 'Blacklists exported to file',
      variant: 'success',
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importBlacklists(event.target?.result as string);
      if (result.success) {
        toast({
          title: 'Import successful',
          description: result.message,
          variant: 'success',
        });
      } else {
        setError(result.message);
        toast({
          title: 'Import failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteBlacklist = () => {
    if (!activeBlacklist) {
      return;
    }
    const name = activeBlacklist.name;
    deleteBlacklist(activeBlacklist.id);
    toast({
      title: 'Blacklist deleted',
      description: `Deleted "${name}"`,
      variant: 'success',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Custom Blacklists
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new blacklist */}
        <div className="flex gap-2">
          <Input
            placeholder="New blacklist name..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
          />
          <Button onClick={handleCreateList} size="icon" title="Create blacklist">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Blacklist selector */}
        {blacklists.length > 0 && (
          <Select
            value={activeBlacklistId || ''}
            onValueChange={setActiveBlacklist}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a blacklist" />
            </SelectTrigger>
            <SelectContent>
              {blacklists.map((bl) => (
                <SelectItem key={bl.id} value={bl.id}>
                  {bl.name} ({bl.entries.length} entries)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active blacklist entries */}
        {activeBlacklist && (
          <>
            {/* Add entry form */}
            <div className="flex gap-2">
              <Input
                placeholder="Pattern (e.g., spam.com, *@temp*.com)"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
                className="flex-1"
              />
              <Select
                value={newPatternType}
                onValueChange={(v) => setNewPatternType(v as BlacklistEntry['type'])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="domain">Domain</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="pattern">Pattern</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddEntry} size="icon" title="Add entry">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Pattern help */}
            <p className="text-xs text-muted-foreground">
              Domain: exact domain (e.g., spam.com). Email: exact email. Pattern: use * for
              any chars, ? for single char (e.g., *@temp*.com)
            </p>

            {/* Entries list */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {activeBlacklist.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No entries yet. Add patterns above.
                </p>
              ) : (
                activeBlacklist.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-2 rounded border ${
                      entry.isActive ? 'bg-background' : 'bg-muted opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.type}
                      </Badge>
                      <span className="font-mono text-sm">{entry.pattern}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleEntry(activeBlacklist.id, entry.id)}
                        title={entry.isActive ? 'Disable' : 'Enable'}
                      >
                        {entry.isActive ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(activeBlacklist.id, entry.id)}
                        title="Delete entry"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Delete blacklist */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteBlacklist}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Blacklist
              </Button>
              <span className="text-xs text-muted-foreground self-center">
                {activeBlacklist.entries.filter((e) => e.isActive).length} active /{' '}
                {activeBlacklist.entries.length} total
              </span>
            </div>
          </>
        )}

        {blacklists.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No blacklists yet. Create one above.
          </p>
        )}

        {/* Import/Export */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={blacklists.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
