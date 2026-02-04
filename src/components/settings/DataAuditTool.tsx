"use client";

import { useState } from 'react';
import { db } from '@/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    SearchCode, 
    AlertTriangle, 
    Database, 
    CheckCircle2, 
    FileWarning, 
    Loader2,
    RefreshCw,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditResult {
    table: string;
    total: number;
    hidden: number;
    orphaned: number;
    reason: string;
}

export const DataAuditTool = () => {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  const runAudit = async () => {
    setIsAuditing(true);
    const audit: AuditResult[] = [];

    const checkTable = async (tableName: string, logic: (items: any[]) => { hidden: number, orphaned: number, reason: string }) => {
        // @ts-ignore
        const all = await db[tableName].toArray();
        const stats = logic(all);
        audit.push({
            table: tableName,
            total: all.length,
            ...stats
        });
    };

    // 1. Classes Audit
    await checkTable('classes', (items) => {
        const hidden = items.filter(c => !c.year_id || !c.term_id).length;
        return { 
            hidden, 
            orphaned: 0, 
            reason: "Classes without 'year_id' or 'term_id' are ignored by the Dashboard and Class List." 
        };
    });

    // 2. Learners Audit
    const classes = await db.classes.toArray();
    const classIds = new Set(classes.map(c => c.id));
    await checkTable('learners', (items) => {
        const orphaned = items.filter(l => !classIds.has(l.class_id)).length;
        return { 
            hidden: 0, 
            orphaned, 
            reason: "Students linked to deleted or non-existent class IDs." 
        };
    });

    // 3. Assessments Audit
    await checkTable('assessments', (items) => {
        const hidden = items.filter(a => !a.term_id).length;
        const orphaned = items.filter(a => !classIds.has(a.class_id)).length;
        return { 
            hidden, 
            orphaned, 
            reason: "Assessments missing a Term reference or linked to deleted classes." 
        };
    });

    // 4. Marks Audit
    const assessments = await db.assessments.toArray();
    const learners = await db.learners.toArray();
    const assIds = new Set(assessments.map(a => a.id));
    const learnerIds = new Set(learners.map(l => l.id));
    await checkTable('assessment_marks', (items) => {
        const orphaned = items.filter(m => !assIds.has(m.assessment_id) || !learnerIds.has(m.learner_id)).length;
        return { 
            hidden: 0, 
            orphaned, 
            reason: "Marks belonging to assessments or students that no longer exist." 
        };
    });

    // 5. Contextual Tables (Activities, Todos, Notes, Evidence)
    const contextTables = ['activities', 'todos', 'learner_notes', 'evidence', 'attendance'];
    for (const table of contextTables) {
        await checkTable(table, (items) => {
            const hidden = items.filter(i => !i.year_id || !i.term_id).length;
            return { 
                hidden, 
                orphaned: 0, 
                reason: "Records missing mandatory Academic Year or Term references." 
            };
        });
    }

    setResults(audit);
    setIsAuditing(false);
  };

  const totalHidden = results.reduce((acc, r) => acc + r.hidden + r.orphaned, 0);

  return (
    <Card className="border-amber-200 bg-amber-50/10 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <SearchCode className="h-5 w-5 text-amber-600" />
                <CardTitle>Data Integrity Audit</CardTitle>
            </div>
            <Button onClick={runAudit} disabled={isAuditing} size="sm" variant="outline" className="bg-white">
                {isAuditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Scan Database
            </Button>
        </div>
        <CardDescription>
          Identify data that exists but is not visible due to missing architectural references.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Database className="h-10 w-10 opacity-20 mb-2" />
                <p className="text-sm">Click 'Scan Database' to begin the audit.</p>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-white border shadow-sm">
                    <div className={cn(
                        "p-3 rounded-full",
                        totalHidden > 0 ? "bg-amber-100" : "bg-green-100"
                    )}>
                        {totalHidden > 0 ? <AlertTriangle className="h-6 w-6 text-amber-600" /> : <CheckCircle2 className="h-6 w-6 text-green-600" />}
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">{totalHidden} Issues Found</h4>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                            {totalHidden > 0 ? "Potential Data Drift Detected" : "Database is healthy and fully visible"}
                        </p>
                    </div>
                </div>

                <ScrollArea className="h-[300px] border rounded-md bg-white">
                    <div className="divide-y">
                        {results.map((res) => (
                            <div key={res.table} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <h5 className="font-black text-xs uppercase tracking-tighter text-muted-foreground">{res.table}</h5>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px]">Total: {res.total}</Badge>
                                        {(res.hidden > 0 || res.orphaned > 0) && (
                                            <Badge variant="destructive" className="text-[10px] animate-pulse">
                                                Inaccessible: {res.hidden + res.orphaned}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {(res.hidden > 0 || res.orphaned > 0) ? (
                                    <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-800">
                                        <FileWarning className="h-4 w-4 shrink-0" />
                                        <p>{res.reason}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Fully compliant with current architecture.</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="text-xs text-blue-900 space-y-1">
                        <p className="font-bold">Why is this data hidden?</p>
                        <p>The app now uses strict filtering to ensure you only see data relevant to your selected **Academic Year** and **Term**. Data created before this version might lack these references.</p>
                        <p className="pt-1 italic">Use the Recovery Tool below to manually patch legacy records.</p>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};