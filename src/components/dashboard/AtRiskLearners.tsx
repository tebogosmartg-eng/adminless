import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { db } from '@/db';
import { useAcademic } from '@/context/AcademicContext';

interface AtRiskStudent {
  id: string;
  name: string;
  className: string;
  average: number;
  failingCount: number;
}

export default function AtRiskLearners() {
  const { activeTerm } = useAcademic();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<AtRiskStudent[]>([]);

  useEffect(() => {
    if (!activeTerm) return;

    const identifyAtRisk = async () => {
      setLoading(true);
      try {
        // 1. Get assessments for active term
        const assessments = await db.assessments
          .where('term_id')
          .equals(activeTerm.id)
          .toArray();
        
        if (assessments.length === 0) {
            setStudents([]);
            setLoading(false);
            return;
        }

        const assessmentIds = assessments.map(a => a.id);
        const classIds = [...new Set(assessments.map(a => a.class_id))];

        // 2. Get Classes Info for names
        const classes = await db.classes.where('id').anyOf(classIds).toArray();
        const classMap = new Map(classes.map(c => [c.id, c.className]));

        // 3. Get Marks
        const marks = await db.assessment_marks
            .where('assessment_id')
            .anyOf(assessmentIds)
            .toArray();

        // 4. Group by Learner
        const learnerStats: { [id: string]: { totalPct: number; count: number; failing: number; classId: string } } = {};
        
        marks.forEach(m => {
            const ass = assessments.find(a => a.id === m.assessment_id);
            if (ass && m.score !== null && m.learner_id) {
                if (!learnerStats[m.learner_id]) {
                    learnerStats[m.learner_id] = { totalPct: 0, count: 0, failing: 0, classId: ass.class_id };
                }
                
                const pct = (Number(m.score) / ass.max_mark) * 100;
                learnerStats[m.learner_id].totalPct += pct;
                learnerStats[m.learner_id].count++;
                if (pct < 50) learnerStats[m.learner_id].failing++;
            }
        });

        // 5. Filter At Risk (< 50% avg OR > 2 failing assessments)
        const atRiskIds = Object.keys(learnerStats).filter(id => {
            const stats = learnerStats[id];
            const avg = stats.totalPct / stats.count;
            return avg < 50 || stats.failing >= 2;
        });

        if (atRiskIds.length === 0) {
            setStudents([]);
            setLoading(false);
            return;
        }

        // 6. Get Learner Names
        const learners = await db.learners.where('id').anyOf(atRiskIds).toArray();
        
        const result: AtRiskStudent[] = learners.map(l => {
            const stats = learnerStats[l.id!];
            if (!stats) return null;
            return {
                id: l.id!,
                name: l.name,
                className: classMap.get(stats.classId) || 'Unknown Class',
                average: Math.round(stats.totalPct / stats.count),
                failingCount: stats.failing
            };
        }).filter(x => x !== null) as AtRiskStudent[];

        // Sort by lowest average
        result.sort((a, b) => a.average - b.average);
        
        setStudents(result.slice(0, 5)); // Top 5
      } catch (e) {
        console.error("Failed to calc at risk", e);
      } finally {
        setLoading(false);
      }
    };

    identifyAtRisk();
  }, [activeTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                    <CardTitle className="text-lg">At Risk Learners</CardTitle>
                    <CardDescription>Students requiring attention this term</CardDescription>
                </div>
            </div>
            {students.length > 0 && (
                <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
                    {students.length} Flagged
                </Badge>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No learners flagged as at-risk.</p>
                <p className="text-xs mt-1">Great job!</p>
            </div>
        ) : (
            <div className="space-y-4">
                {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                                    {student.average}%
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-sm leading-none">{student.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{student.className}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link to={`/learners/${student.id}`}>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        </Button>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}