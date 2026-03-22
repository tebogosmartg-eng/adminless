import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Learner } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { getGradeSymbol } from '@/utils/grading';
import { cn } from '@/lib/utils';

interface MarkDistributionChartProps {
  learners: Learner[];
  title?: string;
  description?: string;
  isDocumentMode?: boolean;
}

const MarkDistributionChart = ({ 
  learners, 
  title = "Mark Distribution", 
  description = "Number of learners per grade symbol.",
  isDocumentMode = false
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

  const ChartArea = () => (
    hasData ? (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDocumentMode ? "#e2e8f0" : undefined} />
            <XAxis dataKey="name" tick={{ fill: isDocumentMode ? "#475569" : undefined }} axisLine={{ stroke: isDocumentMode ? "#cbd5e1" : undefined }} />
            <YAxis allowDecimals={false} tick={{ fill: isDocumentMode ? "#475569" : undefined }} axisLine={{ stroke: isDocumentMode ? "#cbd5e1" : undefined }} />
            {!isDocumentMode && (
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
            )}
            <Legend wrapperStyle={isDocumentMode ? { color: "#475569" } : undefined} />
            <Bar dataKey="count" name="Learners" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className={cn("flex flex-col items-center justify-center h-80 text-muted-foreground", isDocumentMode && "text-slate-600")}>
        <p className="no-print font-medium">{isDocumentMode ? "Awaiting Data" : "Enter some marks to see the distribution chart."}</p>
        <p className={cn("font-medium text-sm text-center mt-2 max-w-sm", isDocumentMode ? "block" : "hidden print:block")}>
            Distribution charts will generate automatically once marks are recorded.
        </p>
      </div>
    )
  );

  if (isDocumentMode) {
    return (
      <div className="mb-6 border border-slate-200 rounded-xl bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 font-medium">{description}</p>
        </div>
        <div className="p-6">
          <ChartArea />
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6 print:shadow-none print:border-slate-300 print-avoid-break">
      <CardHeader>
        <CardTitle className="print:text-black">{title}</CardTitle>
        <CardDescription className="print:text-slate-600">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartArea />
      </CardContent>
    </Card>
  );
};

export default MarkDistributionChart;