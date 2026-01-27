import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';
import { ClassInfo } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface TopLearnersPerGradeProps {
  classes: ClassInfo[];
}

export const TopLearnersPerGrade = ({ classes }: TopLearnersPerGradeProps) => {
  const topPerGrade = useMemo(() => {
    const grades: Record<string, { learner: string; mark: number; subject: string; className: string }> = {};

    classes.forEach(c => {
      c.learners.forEach(l => {
        const mark = parseFloat(l.mark);
        if (!isNaN(mark)) {
          // If no entry for this grade, or current mark is higher, update it
          if (!grades[c.grade] || mark > grades[c.grade].mark) {
            grades[c.grade] = {
              learner: l.name,
              mark: mark,
              subject: c.subject,
              className: c.className
            };
          }
        }
      });
    });

    // Convert to array and sort by Grade name naturally (Grade 8, Grade 9, Grade 10...)
    return Object.entries(grades)
        .map(([grade, data]) => ({ grade, ...data }))
        .sort((a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }));
  }, [classes]);

  if (topPerGrade.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
          <Trophy className="h-5 w-5" />
          Top Performers
        </CardTitle>
        <CardDescription>Highest mark recorded per grade.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topPerGrade.map((item, index) => (
            <div key={item.grade} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                      {item.grade}
                   </Badge>
                   <span className="font-semibold text-sm truncate max-w-[120px]" title={item.learner}>
                      {item.learner}
                   </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                   <Medal className="h-3 w-3 text-muted-foreground" />
                   {item.subject} <span className="opacity-50">•</span> {item.className}
                </div>
              </div>
              <div className="flex flex-col items-end">
                 <span className="text-lg font-bold text-green-600">{item.mark}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};