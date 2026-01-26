import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAcademic } from '@/context/AcademicContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';

export const YearPerformanceTrend = () => {
  const { activeYear, terms } = useAcademic();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeYear || terms.length === 0) return;

    const fetchTrendData = async () => {
        setLoading(true);
        const termIds = terms.map(t => t.id);
        
        // Fetch all assessments and marks for this year
        const { data: assessments } = await supabase
            .from('assessments')
            .select('id, term_id, max_mark')
            .in('term_id', termIds);
            
        if (!assessments) {
            setLoading(false);
            return;
        }

        const assessmentIds = assessments.map(a => a.id);
        
        const { data: marks } = await supabase
            .from('assessment_marks')
            .select('assessment_id, score')
            .in('assessment_id', assessmentIds);

        if (!marks) {
            setLoading(false);
            return;
        }

        // Calculate Average per Term
        const trendData = terms.map(term => {
            const termAssessments = assessments.filter(a => a.term_id === term.id);
            const termAssessmentIds = new Set(termAssessments.map(a => a.id));
            
            const termMarks = marks.filter(m => termAssessmentIds.has(m.assessment_id) && m.score !== null);
            
            let totalPercent = 0;
            let count = 0;

            termMarks.forEach(m => {
                const ass = termAssessments.find(a => a.id === m.assessment_id);
                if (ass) {
                    totalPercent += (Number(m.score) / ass.max_mark) * 100;
                    count++;
                }
            });

            return {
                name: term.name,
                average: count > 0 ? Math.round(totalPercent / count) : 0,
                assessments: count
            };
        });

        setData(trendData);
        setLoading(false);
    };

    fetchTrendData();
  }, [activeYear, terms]);

  if (!activeYear) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Year Performance Trend
        </CardTitle>
        <CardDescription>Average performance across all classes for {activeYear.name}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            formatter={(value: number) => [`${value}%`, "Average"]}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="average" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))" }}
                            activeDot={{ r: 6 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )}
      </CardContent>
    </Card>
  );
};