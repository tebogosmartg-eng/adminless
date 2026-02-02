import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClasses } from '@/context/ClassesContext';

export const EvidenceComplianceWidget = () => {
  const { classes } = useClasses();
  
  const stats = useLiveQuery(async () => {
    const evidence = await db.evidence.toArray();
    const activeClasses = classes.filter(c => !c.archived);
    
    if (activeClasses.length === 0) return { percent: 0, count: 0, missing: 0 };

    // Simply checking how many classes have AT LEAST one piece of evidence
    const classesWithEvidence = new Set(evidence.map(e => e.class_id));
    const coveredClasses = activeClasses.filter(c => classesWithEvidence.has(c.id)).length;
    
    return {
        percent: Math.round((coveredClasses / activeClasses.length) * 100),
        count: evidence.length,
        missing: activeClasses.length - coveredClasses
    };
  }, [classes]);

  if (!stats) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Audit Readiness
            </CardTitle>
            <Link to="/evidence-audit" className="text-xs text-primary hover:underline flex items-center gap-1">
                Logs <ArrowRight className="h-3 w-3" />
            </Link>
        </div>
        <CardDescription>Evidence capture across active classes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
                <span>Compliance Score</span>
                <span className={stats.percent < 50 ? "text-amber-600" : "text-green-600"}>{stats.percent}%</span>
            </div>
            <Progress value={stats.percent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-muted/30 p-2 rounded-md border text-center">
                <p className="text-xl font-bold">{stats.count}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Total Docs</p>
            </div>
            <div className="bg-muted/30 p-2 rounded-md border text-center">
                <p className="text-xl font-bold">{stats.missing}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Pending Classes</p>
            </div>
        </div>

        {stats.missing > 0 && (
            <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                <AlertCircle className="h-3 w-3" />
                <span>{stats.missing} classes have zero audit evidence attached.</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
};