'use client';

import { useAnalyticsStore } from '@/stores/analytics-store';
import { UsageOverview } from '@/components/analytics/UsageOverview';
import { RequestsChart } from '@/components/analytics/RequestsChart';
import { EndpointTable } from '@/components/analytics/EndpointTable';
import { ResponseTimeChart } from '@/components/analytics/ResponseTimeChart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';

export default function AnalyticsPage() {
  const { exportData, clearRequests } = useAnalyticsStore();

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportData(format);
    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-usage.${format}`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export complete',
      description: `Data exported as ${format.toUpperCase()}`,
      variant: 'success',
    });
  };

  const handleClear = () => {
    clearRequests();
    toast({
      title: 'Data cleared',
      description: 'All analytics data has been cleared',
      variant: 'success',
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Usage Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your API usage and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Data
          </Button>
        </div>
      </div>

      <UsageOverview />

      <Tabs defaultValue="hourly">
        <TabsList>
          <TabsTrigger value="hourly">Hourly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
        </TabsList>
        <TabsContent value="hourly" className="space-y-4">
          <RequestsChart timeRange="hourly" />
        </TabsContent>
        <TabsContent value="daily" className="space-y-4">
          <RequestsChart timeRange="daily" />
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResponseTimeChart />
        <EndpointTable />
      </div>
    </div>
  );
}
