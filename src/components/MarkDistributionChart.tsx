import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Learner } from '@/components/CreateClassDialog';

interface MarkDistributionChartProps {
  learners: Learner[];
}

const MarkDistributionChart = ({ learners }: MarkDistributionChartProps) => {
  const chartData = useMemo(() => {
    const ranges = [
      { name: '0-9', count: 0 },
      { name: '10-19', count: 0 },
      { name: '20-29', count: 0 },
      { name: '30-39', count: 0 },
      { name: '40-49', count: 0 },
      { name: '50-59', count: 0 },
      { name: '60-69', count: 0 },
      { name: '70-79', count: 0 },
      { name: '80-89', count: 0 },
      { name: '90-100', count: 0 },
    ];

    learners.forEach(learner => {
      if (learner.mark && !isNaN(parseFloat(learner.mark))) {
        const mark = parseFloat(learner.mark);
        if (mark >= 0 && mark <= 100) {
          const rangeIndex = Math.floor(mark / 10);
          // Handle 100% case
          const finalIndex = rangeIndex === 10 ? 9 : rangeIndex;
          ranges[finalIndex].count++;
        }
      }
    });

    return ranges;
  }, [learners]);

  const hasData = useMemo(() => learners.some(l => l.mark && !isNaN(parseFloat(l.mark))), [learners]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Mark Distribution</CardTitle>
        <CardDescription>Number of learners in each mark percentage range.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="Learners" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            <p>Enter some marks to see the distribution chart.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarkDistributionChart;