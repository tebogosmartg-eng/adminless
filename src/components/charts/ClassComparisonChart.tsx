import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClassInfo } from '@/lib/types';
import { calculateClassStats } from '@/utils/stats';

interface ClassComparisonChartProps {
  classes: ClassInfo[];
}

const ClassComparisonChart = ({ classes }: ClassComparisonChartProps) => {
  const data = classes.map(c => {
    const stats = calculateClassStats(c.learners);
    return {
      name: c.className,
      subject: c.subject,
      average: stats.average,
    };
  });

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Performance by Class</CardTitle>
        <CardDescription className="text-xs italic">Average percentage across active class groups.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                domain={[0, 100]}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-md border bg-background p-3 shadow-md border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{d.subject}</p>
                        <p className="text-sm font-bold text-foreground">{d.name}: {d.average}%</p>
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
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassComparisonChart;