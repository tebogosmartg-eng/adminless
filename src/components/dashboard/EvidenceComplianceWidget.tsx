import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, ArrowRight, AlertCircle, FileCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClasses } from '@/context/ClassesContext';

export const EvidenceComplianceWidget = () => {
  const { classes } = useClasses();
  
  const stats = useLiveQuery(async () => {
    const evidence = await db.evidence.toArray();
    const samples = await db.moderation_samples.toArray();
    const activeClasses = classes.filter(c => !c.archived);
    
    if (activeClasses.length === 0) return { percent: 0, count: 0, missing: 0, samplePercent: 0 };

    // 1. General Coverage (At least one doc)
    const classesWithEvidence = new Set(evidence.map(e => e.class_id));
    const coveredClasses = activeClasses.filter(c => classesWithEvidence.has(c.id)).length;
    
    // 2. Strict Moderation Compliance
    // Calculate what % of required sample scripts are actually uploaded
    let totalRequired = 0;
    let totalUploaded = 0;

    activeClasses.forEach(cls => {
        const sample = samples.find(s => s.class_id === cls.id);
        if (sample) {
            totalRequired += sample.learner_ids.length;
            const classEvidence = evidence.filter(e => e.class_id === cls.id);
            const uploadedIds = new Set(classEvidence.filter(e => e.category === 'script').map(e => e.learner_id));
            
            sample.learner_ids.forEach(lId => {
                if (uploadedIds.has(lId)) totalUploaded++;
            });
        }
    });
    
    return {
        percent: Math.round((coveredClasses / activeClasses.length) * 100),
        count: evidence.length,
        missing: activeClasses.length - coveredClasses,
        samplePercent: totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 0,
        totalRequired,
        totalUploaded
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
        <CardDescription>Consolidated moderation proof for active classes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                    <FileCheck className="h-3 w-3 text-blue-600" /> 
                    Sample Script Completion
                </span>
                <span className={stats.samplePercent < 80 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                    {stats.samplePercent}%
                </span>
            </div>
            <Progress value={stats.samplePercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-muted/30 p-2 rounded-md border text-center">
                <p className="text-xl font-bold">{stats.count}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Total Docs</p>
            </div>
            <div className="bg-muted/30 p-2 rounded-md border text-center">
                <p className="text-xl font-bold">{stats.totalUploaded} / {stats.totalRequired}</p>
                <p className="text-[10px] uppercase text-muted-foreground">Sample Scripts</p>
            </div>
        </div>

        {stats.totalUploaded < stats.totalRequired && (
            <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                <AlertCircle className="h-3 w-3" />
                <span>{stats.totalRequired - stats.totalUploaded} selected sample scripts are missing from your file.</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
};