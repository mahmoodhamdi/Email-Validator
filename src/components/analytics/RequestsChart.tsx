'use client';

import { useAnalyticsStore } from '@/stores/analytics-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RequestsChartProps {
  timeRange: 'hourly' | 'daily';
}

export function RequestsChart({ timeRange }: RequestsChartProps) {
  const { getHourlyStats, getDailyStats } = useAnalyticsStore();

  const data = timeRange === 'hourly' ? getHourlyStats(24) : getDailyStats(30);

  const formatXAxis = (value: string) => {
    if (timeRange === 'hourly') {
      return value.split(' ')[1] || value;
    }
    return value.split('-').slice(1).join('/');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Request Volume (
          {timeRange === 'hourly' ? 'Last 24 Hours' : 'Last 30 Days'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={timeRange === 'hourly' ? 'hour' : 'date'}
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#2563eb"
                name="Requests"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="#dc2626"
                name="Errors"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
