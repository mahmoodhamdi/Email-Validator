'use client';

import { useAnalyticsStore } from '@/stores/analytics-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function ResponseTimeChart() {
  const { getHourlyStats } = useAnalyticsStore();
  const data = getHourlyStats(24);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Time (Last 24 Hours)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tickFormatter={(value) => value.split(' ')[1] || value}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} unit="ms" />
              <Tooltip
                formatter={(value) => [`${value ?? 0}ms`, 'Avg Response Time']}
              />
              <Area
                type="monotone"
                dataKey="avgResponseTime"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
