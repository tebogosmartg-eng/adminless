import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Learner } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { getGradeSymbol } from '@/utils/grading';

interface MarkDistributionChartProps {
  learners: Learner[];
  title?: string;
  description?: string;
}

const MarkDistributionChart = ({ 
  learners, 
  title = "Mark Distribution", 
  description = "Number of learners per grade symbol." 
}: MarkDistributionChartProps) => {
  const { gradingScheme } = useSettings();

  const chartData = useMemo(() => {
    // Defense: Ensure gradingScheme is an array before spreading
    const safeScheme = Array.isArray(gradingScheme) ? gradingScheme : [];
    
    // Initialize counts for each symbol in the scheme
    // Sort by min value ascending so the chart goes from low to high marks left-to-right
    const sortedScheme = [...safeScheme].sort((a, b) => a.min - b.min);
    
    const data = sortedScheme.map(grade => ({
      name: grade.symbol,
      count: 0,
      min: grade.min,
      fill: grade.color.replace('text-', 'var(--') 
    }));

    learners.forEach(learner => {
      if (learner.mark && !isNaN(parseFloat(learner.mark))) {
        const symbolObj = getGradeSymbol(learner.mark, safeScheme);
        if (symbolObj) {
          const dataPoint = data.find(d => d.name === symbolObj.symbol);
          if (dataPoint) {
            dataPoint.count++;
          }
        }
      }
    });

    return data;
  }, [learners, gradingScheme]);

  const hasData = useMemo(() => learners.some(l => l.mark && !isNaN(parseFloat(l.mark))), [learners]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="Learners" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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