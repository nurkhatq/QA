'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ScoreTrendChartProps {
  data: Array<{
    month: string;
    averageScore: number;
    count: number;
  }>;
  scoreChange?: number | null;
  totalAudits: number;
}

export function ScoreTrendChart({ data, scoreChange, totalAudits }: ScoreTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Динамика качества</CardTitle>
          <CardDescription>Нет данных для отображения</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasTrend = scoreChange !== null && scoreChange !== undefined;
  const isPositive = scoreChange && scoreChange > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Динамика качества
          {hasTrend && (
            <Badge
              variant="outline"
              className={`${
                isPositive
                  ? 'text-green-600 bg-green-50 border-green-200'
                  : 'text-red-600 bg-red-50 border-red-200'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>{isPositive ? '+' : ''}{scoreChange.toFixed(1)}%</span>
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Средний балл по периодам • {totalAudits} {totalAudits === 1 ? 'аудит' : 'аудитов'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                return monthNames[parseInt(month) - 1];
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Балл (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const [year, month] = payload[0].payload.month.split('-');
                  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{monthNames[parseInt(month) - 1]} {year}</p>
                      <p className="text-sm">
                        Средний балл: <span className="font-bold">{payload[0].value}%</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Аудитов: {payload[0].payload.count}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="averageScore"
              stroke="hsl(221, 83%, 53%)"
              strokeWidth={2}
              fill="url(#colorScore)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
