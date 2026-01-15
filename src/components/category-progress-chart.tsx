'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryProgressChartProps {
  data: Array<{
    month: string;
    categories: Record<string, number>;
  }>;
}

const COLORS = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#0891b2", // cyan-600
  "#4f46e5", // indigo-600
];

export function CategoryProgressChart({ data }: CategoryProgressChartProps) {
  if (!data || data.length === 0) return null;

  // Extract all unique categories from the data
  const allCategories = Array.from(
    new Set(
      data.flatMap(item => Object.keys(item.categories))
    )
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Прогресс по категориям</CardTitle>
        <CardDescription>
          Динамика изменений качества по отдельным навыкам
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              {allCategories.map((category, index) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={`categories.${category}`}
                  name={category}
                  stroke={COLORS[index % COLORS.length]}
                  activeDot={{ r: 8 }}
                  connectNulls
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
