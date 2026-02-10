"use client";

import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { Learner } from '@/lib/types';

interface CorrelationChartProps {
  data: { x: number; y: number; id: string }[];
  learners: Learner[];
  atRiskThreshold: number;
}

export const CorrelationChart = ({ data, learners, atRiskThreshold }: CorrelationChartProps) => {
  return (
    <div className="h-[300px] w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Attendance" 
            unit="%" 
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            label={{ value: 'Attendance Rate', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#666' }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Mark" 
            unit="%" 
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            label={{ value: 'Average Mark', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#666' }}
          />
          <ZAxis type="number" range={[60, 400]} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
                if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const learner = learners.find(l => l.id === d.id);
                    return (
                        <div className="bg-popover border p-2 rounded shadow-md text-xs">
                            <p className="font-bold border-b mb-1 pb-1">{learner?.name}</p>
                            <p>Avg Mark: <span className="font-bold text-primary">{d.y}%</span></p>
                            <p>Attendance: <span className="font-bold">{d.x}%</span></p>
                        </div>
                    );
                }
                return null;
            }}
          />
          <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
          <ReferenceLine x={80} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
          <Scatter name="Students" data={data}>
            {data.map((entry, index) => {
              const isFailing = entry.y < 50;
              const isLowAtt = entry.x < 80;
              let color = "hsl(var(--primary))";
              if (isFailing && isLowAtt) color = "#ef4444"; // Critical (Red)
              else if (isFailing) color = "#f97316"; // Academic only (Orange)
              else if (isLowAtt) color = "#f59e0b"; // Attendance only (Yellow)
              
              return <Cell key={`cell-${index}`} fill={color} strokeWidth={1} stroke="#fff" />;
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};