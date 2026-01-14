'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ScoreChartProps {
  data: Array<{
    month: string;
    averageScore: number;
    count: number;
  }>;
  title?: string;
  description?: string;
}

export function ScoreChart({ data, title = 'Динамика показателей', description }: ScoreChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{payload[0].payload.month}</p>
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
            <Legend />
            <Line 
              type="monotone" 
              dataKey="averageScore" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Средний балл"
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
