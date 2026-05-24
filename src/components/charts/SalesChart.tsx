import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ChartPoint {
  label: string;
  sales: number;
  profit: number;
}

interface SalesChartProps {
  data: ChartPoint[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  if (!data.length) {
    return <div className="flex items-center justify-center h-60 text-gray-400 text-sm">لا توجد بيانات كافية للرسم البياني</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00c950" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#00c950" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          labelStyle={{ fontWeight: 600, color: '#1e293b' }}
        />
        <Area type="monotone" dataKey="sales" stroke="#00c950" strokeWidth={2.5} fill="url(#salesGrad)" name="المبيعات" dot={false} />
        <Area type="monotone" dataKey="profit" stroke="#6366f1" strokeWidth={2.5} fill="url(#profitGrad)" name="صافي الربح" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;
