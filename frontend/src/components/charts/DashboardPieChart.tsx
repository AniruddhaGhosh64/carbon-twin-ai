import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface BreakdownItem {
  name: string;
  value: number;
  color: string;
  raw: number;
}

interface DashboardPieChartProps {
  data: BreakdownItem[];
  formatEmissions: (val: number) => string;
  getPct: (val: number) => string;
}

export default function DashboardPieChart({ data, formatEmissions, getPct }: DashboardPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const dataVal = payload[0].payload;
              return (
                <div className="bg-glass rounded-lg p-3 text-left shadow-lg border border-glass">
                  <span className="text-xs font-bold text-on-surface block">{dataVal.name}</span>
                  <span className="text-[11px] text-primary block mt-1">Emissions: {formatEmissions(dataVal.raw)}</span>
                  <span className="text-[11px] text-on-surface-variant block">Percentage: {getPct(dataVal.value)}</span>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
