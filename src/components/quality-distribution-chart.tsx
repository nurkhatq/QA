'use client';

import { Pie, PieChart, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface QualityDistributionChartProps {
  data: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  totalAudits: number;
}

const COLORS = {
  excellent: 'hsl(142, 76%, 36%)', // green
  good: 'hsl(221, 83%, 53%)', // blue
  average: 'hsl(48, 96%, 53%)', // yellow
  poor: 'hsl(0, 84%, 60%)', // red
};

export function QualityDistributionChart({ data, totalAudits }: QualityDistributionChartProps) {
  const chartData = [
    { name: 'Отлично (90%+)', value: data.excellent, fill: COLORS.excellent },
    { name: 'Хорошо (70-89%)', value: data.good, fill: COLORS.good },
    { name: 'Средне (50-69%)', value: data.average, fill: COLORS.average },
    { name: 'Плохо (<50%)', value: data.poor, fill: COLORS.poor },
  ].filter(item => item.value > 0);

  const total = data.excellent + data.good + data.average + data.poor;

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Распределение качества</CardTitle>
          <CardDescription>Нет данных для отображения</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Распределение качества</CardTitle>
        <CardDescription>
          {totalAudits} {totalAudits === 1 ? 'аудит' : 'аудитов'} по уровням оценок
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const percent = ((payload[0].value as number / total) * 100).toFixed(1);
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{payload[0].name}</p>
                      <p className="text-sm">
                        Количество: <span className="font-bold">{payload[0].value}</span>
                      </p>
                      <p className="text-sm">
                        Процент: <span className="font-bold">{percent}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
