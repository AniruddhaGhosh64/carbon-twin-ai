import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TimelinePoint {
  name: string;
  baseline: number;
  projected: number;
}

interface SimulatorChartProps {
  data: TimelinePoint[];
}

export default function SimulatorChart({ data }: SimulatorChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#95d4b3" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#95d4b3" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid 
          stroke="#1B4332" 
          strokeOpacity={0.5} 
          strokeWidth={0.5} 
          vertical={false} 
        />
        <XAxis 
          dataKey="name" 
          stroke="#8a938c" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#8a938c" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#10231c",
            border: "1px solid rgba(216, 226, 220, 0.1)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#d1e8dc",
          }}
        />
        <Area
          type="monotone"
          dataKey="baseline"
          stroke="#8a938c"
          strokeWidth={1}
          strokeDasharray="4 4"
          fill="none"
          name="Baseline Trajectory"
        />
        <Area
          type="monotone"
          dataKey="projected"
          stroke="#95d4b3"
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#colorProjected)"
          name="Projected Trajectory"
          dot={{ r: 4, fill: "#95d4b3", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#95d4b3" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
