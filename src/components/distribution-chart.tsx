'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DistributionChartProps {
  data: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  title?: string;
  description?: string;
}

export function DistributionChart({ 
  data, 
  title = 'Распределение оценок',
  description 
}: DistributionChartProps) {
  const chartData = [
    { name: 'Отлично (90-100%)', value: data.excellent, color: '#22c55e' },
    { name: 'Хорошо (70-89%)', value: data.good, color: '#3b82f6' },
    { name: 'Средне (50-69%)', value: data.average, color: '#f59e0b' },
    { name: 'Плохо (<50%)', value: data.poor, color: '#ef4444' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{payload[0].payload.name}</p>
                      <p className="text-sm">
                        Количество: <span className="font-bold">{payload[0].value}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
