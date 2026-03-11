import { useLearnerAssessmentData, AssessmentResult } from '@/hooks/useLearnerAssessmentData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingUp, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { format } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';

interface ProfileAcademicTabProps {
  learnerId?: string;
}

export const ProfileAcademicTab = ({ learnerId }: ProfileAcademicTabProps) => {
  const { loading, results } = useLearnerAssessmentData(learnerId);
  const { atRiskThreshold } = useSettings();

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
        <FileText className="h-12 w-12 mb-3 opacity-20" />
        <p>No detailed assessment data found.</p>
        <p className="text-xs">Use the "Assessments" tab in Class Details to capture marks.</p>
      </div>
    );
  }

  // Group by Term
  const byTerm: Record<string, AssessmentResult[]> = {};
  results.forEach(r => {
    if (!byTerm[r.termName]) byTerm[r.termName] = [];
    byTerm[r.termName].push(r);
  });

  return (
    <div className="space-y-6 pt-4 h-full overflow-y-auto pr-2">
      {/* Trend Chart */}
      <Card className="p-4 border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Performance Trend</h4>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={results.filter(r => r.percentage !== null)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="assessmentTitle" 
                hide 
              />
              <YAxis domain={[0, 100]} width={30} tick={{fontSize: 10}} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as AssessmentResult;
                    return (
                      <div className="bg-popover border rounded-md p-2 shadow-md text-xs">
                        <p className="font-bold mb-1">{data.assessmentTitle}</p>
                        <div className="space-y-1">
                            <p className="text-primary font-bold">Learner: {data.percentage}%</p>
                            {data.classAverage && <p className="text-muted-foreground">Class Avg: {data.classAverage}%</p>}
                        </div>
                        <p className="text-muted-foreground mt-1 text-[10px]">{format(new Date(data.date), 'MMM d')}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="plainline"/>
              <ReferenceLine y={atRiskThreshold} stroke="red" strokeDasharray="3 3" opacity={0.3} />
              
              <Line 
                type="monotone" 
                dataKey="percentage" 
                name="Learner"
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
                activeDot={{ r: 6 }} 
              />
              
              <Line 
                type="monotone" 
                dataKey="classAverage" 
                name="Class Avg"
                stroke="#94a3b8" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Term Breakdowns */}
      <div className="space-y-6">
        {Object.entries(byTerm).map(([term, items]) => (
          <div key={term} className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
               <h4 className="font-semibold text-sm">{term}</h4>
               <Badge variant="outline" className="text-[10px]">{items.length} assessments</Badge>
            </div>
            <div className="grid gap-2">
              {items.map((item, idx) => {
                const isHighRisk = item.trend === 'Declining' && item.percentage !== null && item.percentage < atRiskThreshold;

                return (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isHighRisk ? 'bg-red-50/50 border-red-200 hover:bg-red-50' : 'bg-muted/30 hover:bg-muted/50'}`}>
                    <div className="flex flex-col gap-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate" title={item.assessmentTitle}>{item.assessmentTitle}</span>
                          {isHighRisk && (
                            <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black uppercase tracking-widest gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> High Risk
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(item.date), 'dd MMM')}</span>
                          <span>•</span>
                          <span>{item.assessmentType}</span>
                          <span>•</span>
                          <span>W: {item.weight}%</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {item.percentage !== null ? (
                          <>
                            <div className={`text-lg font-bold ${item.percentage >= atRiskThreshold ? 'text-green-600' : 'text-red-600'}`}>
                              {item.percentage}%
                            </div>
                            {item.classAverage && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Class Avg: {item.classAverage}%
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                              {item.previousAverage !== null ? (
                                  <>
                                      Prev: {item.previousAverage}%
                                      <span className={`ml-1 ${item.trend === 'Improving' ? 'text-green-600' : item.trend === 'Declining' ? 'text-red-600' : 'text-blue-600'}`}>
                                          ({item.trend})
                                      </span>
                                  </>
                              ) : (
                                  <span className="italic opacity-60">No prior data</span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Pending</span>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};