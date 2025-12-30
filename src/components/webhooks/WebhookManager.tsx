'use client';

import { useState } from 'react';
import { useWebhookStore } from '@/stores/webhook-store';
import { WEBHOOK_EVENTS, type WebhookEventType } from '@/lib/webhooks/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';

export function WebhookManager() {
  const {
    webhooks,
    createWebhook,
    deleteWebhook,
    toggleWebhook,
    regenerateSecret,
    getDeliveries,
    addDelivery,
  } = useWebhookStore();

  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([]);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!newUrl.trim()) {
      setError('Please enter a webhook URL');
      return;
    }

    // Validate URL
    try {
      new URL(newUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    if (selectedEvents.length === 0) {
      setError('Please select at least one event');
      return;
    }

    const webhook = createWebhook(newUrl, selectedEvents, newDescription);
    setNewUrl('');
    setNewDescription('');
    setSelectedEvents([]);
    setError('');

    toast({
      title: 'Webhook created',
      description: 'Your webhook has been created. Save the secret securely!',
      variant: 'success',
    });

    // Show secret automatically for new webhook
    setShowSecrets((prev) => ({ ...prev, [webhook.id]: true }));
  };

  const handleTest = async (webhookId: string) => {
    const webhook = webhooks.find((w) => w.id === webhookId);
    if (!webhook) {
      return;
    }

    setTesting(webhookId);
    try {
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhook.url,
          secret: webhook.secret,
          event: webhook.events[0],
        }),
      });

      const result = await response.json();

      // Add delivery to store
      if (result.delivery) {
        addDelivery({
          ...result.delivery,
          webhookId,
          payload: {
            event: webhook.events[0],
            timestamp: new Date().toISOString(),
            data: { email: 'test@example.com', result: {}, validatedAt: new Date().toISOString() },
          },
          createdAt: new Date(),
        });
      }

      toast({
        title: result.success ? 'Test successful' : 'Test failed',
        description: result.message,
        variant: result.success ? 'success' : 'destructive',
      });
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const handleCopySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast({
        title: 'Copied',
        description: 'Secret copied to clipboard',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateSecret = (webhookId: string) => {
    const newSecret = regenerateSecret(webhookId);
    setShowSecrets((prev) => ({ ...prev, [webhookId]: true }));
    toast({
      title: 'Secret regenerated',
      description: 'Make sure to update your endpoint with the new secret',
      variant: 'success',
    });
    return newSecret;
  };

  const toggleEventSelection = (event: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) {
      return 'Never';
    }
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Create Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Add Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Events</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-2 cursor-pointer p-2 rounded border hover:bg-muted"
                >
                  <Checkbox
                    checked={selectedEvents.includes(option.value)}
                    onCheckedChange={() => toggleEventSelection(option.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">{option.label}</span>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={!newUrl || selectedEvents.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Webhook List */}
      {webhooks.map((webhook) => {
        const deliveries = getDeliveries(webhook.id);
        const recentDeliveries = deliveries.slice(0, 5);

        return (
          <Card key={webhook.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* URL and Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {webhook.failureCount > 0 && (
                        <Badge variant="destructive">
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-sm truncate">{webhook.url}</p>
                    {webhook.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {webhook.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(webhook.id)}
                      disabled={testing === webhook.id || !webhook.isActive}
                      title="Send test webhook"
                    >
                      {testing === webhook.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWebhook(webhook.id)}
                    >
                      {webhook.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        deleteWebhook(webhook.id);
                        toast({
                          title: 'Webhook deleted',
                          variant: 'success',
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Secret */}
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-sm text-muted-foreground">Secret:</span>
                  <code className="text-sm flex-1 truncate">
                    {showSecrets[webhook.id]
                      ? webhook.secret
                      : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        [webhook.id]: !prev[webhook.id],
                      }))
                    }
                    title={showSecrets[webhook.id] ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecrets[webhook.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopySecret(webhook.secret)}
                    title="Copy secret"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRegenerateSecret(webhook.id)}
                    title="Regenerate secret"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Events */}
                <div className="flex flex-wrap gap-1">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="outline">
                      {event}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="text-xs text-muted-foreground">
                  Created: {formatDate(webhook.createdAt)} | Last triggered:{' '}
                  {formatDate(webhook.lastTriggeredAt)}
                </div>

                {/* Recent Deliveries */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Recent Deliveries</h4>
                  {recentDeliveries.length > 0 ? (
                    <div className="space-y-1">
                      {recentDeliveries.map((delivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {delivery.status === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : delivery.status === 'failed' ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-mono text-xs">
                              {delivery.event}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {delivery.responseStatus && (
                              <span className="text-xs">
                                HTTP {delivery.responseStatus}
                              </span>
                            )}
                            {delivery.error && (
                              <span className="text-xs text-red-500 truncate max-w-32">
                                {delivery.error}
                              </span>
                            )}
                            <span className="text-xs">
                              {delivery.attempts} attempt
                              {delivery.attempts !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No deliveries yet
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {webhooks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No webhooks configured.</p>
          <p className="text-sm">Add a webhook above to receive notifications.</p>
        </div>
      )}
    </div>
  );
}
