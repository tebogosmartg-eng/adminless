import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClassInfo } from '@/components/CreateClassDialog';
import { calculateClassStats } from '@/utils/stats';

interface ClassComparisonChartProps {
  classes: ClassInfo[];
}

const ClassComparisonChart = ({ classes }: ClassComparisonChartProps) => {
  const data = classes.map(c => {
    const stats = calculateClassStats(c.learners);
    return {
      name: `${c.grade} ${c.subject}`, // Full name for tooltip
      shortName: c.className,          // Short name for X-Axis
      average: stats.average,
      passRate: stats.passRate,
      learners: c.learners.length
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Comparison</CardTitle>
        <CardDescription>Average mark percentage per class.</CardDescription>
      </CardHeader>
      <CardContent>
        {classes.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="shortName" 
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Class
                              </span>
                              <span className="font-bold text-foreground">
                                {data.name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Average
                              </span>
                              <span className="font-bold text-foreground">
                                {data.average}%
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Pass Rate
                              </span>
                              <span className="font-bold text-foreground">
                                {data.passRate}%
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Learners
                              </span>
                              <span className="font-bold text-foreground">
                                {data.learners}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="average" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No class data available to chart.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassComparisonChart;