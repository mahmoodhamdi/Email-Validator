'use client';

import { useAnalyticsStore } from '@/stores/analytics-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function EndpointTable() {
  const { getEndpointStats } = useAnalyticsStore();
  const stats = getEndpointStats();

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 99) {
      return 'text-green-600';
    }
    if (rate >= 95) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoint Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Endpoint</TableHead>
              <TableHead className="text-right">Requests</TableHead>
              <TableHead className="text-right">Success Rate</TableHead>
              <TableHead className="text-right">Avg Response</TableHead>
              <TableHead className="text-right">P95 Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((stat) => (
              <TableRow key={stat.endpoint}>
                <TableCell className="font-mono text-sm">
                  {stat.endpoint}
                </TableCell>
                <TableCell className="text-right">
                  {stat.requests.toLocaleString()}
                </TableCell>
                <TableCell
                  className={`text-right ${getSuccessRateColor(stat.successRate)}`}
                >
                  {stat.successRate.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  {stat.avgResponseTime}ms
                </TableCell>
                <TableCell className="text-right">
                  {stat.p95ResponseTime}ms
                </TableCell>
              </TableRow>
            ))}
            {stats.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No endpoint data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
