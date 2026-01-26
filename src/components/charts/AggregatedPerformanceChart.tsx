import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClassInfo } from '@/types';
import { calculateClassStats } from '@/utils/stats';

type GroupBy = 'subject' | 'grade';

interface AggregatedPerformanceChartProps {
  classes: ClassInfo[];
  groupBy: GroupBy;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AggregatedPerformanceChart = ({ classes, groupBy }: AggregatedPerformanceChartProps) => {
  const data = useMemo(() => {
    const groups: Record<string, { totalMarks: number; count: number; learnerCount: number }> = {};

    classes.forEach(c => {
      const key = c[groupBy]; // 'subject' or 'grade'
      if (!groups[key]) {
        groups[key] = { totalMarks: 0, count: 0, learnerCount: 0 };
      }

      const stats = calculateClassStats(c.learners);
      
      // We weight by the number of learners with marks to get a true aggregate average
      // Or we can just take the average of class averages. 
      // Let's do weighted average based on individual learner marks for accuracy.
      const validMarks = c.learners
        .map(l => parseFloat(l.mark))
        .filter(m => !isNaN(m));
        
      const sum = validMarks.reduce((a, b) => a + b, 0);
      
      groups[key].totalMarks += sum;
      groups[key].count += validMarks.length;
      groups[key].learnerCount += c.learners.length;
    });

    return Object.entries(groups).map(([name, stats], index) => ({
      name,
      average: stats.count > 0 ? Math.round(stats.totalMarks / stats.count) : 0,
      learners: stats.learnerCount,
      fill: COLORS[index % COLORS.length]
    })).sort((a, b) => b.average - a.average); // Sort by highest average
  }, [classes, groupBy]);

  const title = groupBy === 'subject' ? "Performance by Subject" : "Performance by Grade";
  const description = groupBy === 'subject' 
    ? "Average performance across all classes for each subject." 
    : "Average performance across all subjects for each grade.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 12 }} 
                  interval={0}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md text-xs">
                          <p className="font-bold mb-1">{d.name}</p>
                          <p>Average: {d.average}%</p>
                          <p className="text-muted-foreground">Learners: {d.learners}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={30}>
                   {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    {/* Add labels inside/end of bars */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AggregatedPerformanceChart;