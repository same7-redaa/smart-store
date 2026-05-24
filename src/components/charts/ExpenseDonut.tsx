import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#00c950', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444', '#6b7280', '#06b6d4'];

interface ExpenseItem {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ExpenseDonutProps {
  data: { list: ExpenseItem[]; total: number };
}

const ExpenseDonut: React.FC<ExpenseDonutProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.total) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-gray-400 text-sm">
        لا توجد مصروفات في هذه الفترة
      </div>
    );
  }

  const chartData = data.list.map((item, i) => ({
    name: item.category,
    value: item.amount,
    color: COLORS[i % COLORS.length],
    percentage: item.percentage,
  }));

  return (
    <div className="flex items-center gap-4 w-full">
      <ResponsiveContainer width="50%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={(_, idx) => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.color}
                stroke={hoveredIndex === idx ? entry.color : 'transparent'}
                strokeWidth={hoveredIndex === idx ? 3 : 0}
                style={{ transition: 'all 0.2s', cursor: 'pointer', filter: hoveredIndex === idx ? 'brightness(1.1)' : 'none' }}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toLocaleString()} ج.م`, name]}
            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-1.5">
        {chartData.slice(0, 5).map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-1.5 rounded-lg transition-all ${hoveredIndex === idx ? 'bg-gray-50' : ''}`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-medium text-gray-600 truncate">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-gray-700 shrink-0">{item.percentage.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseDonut;
