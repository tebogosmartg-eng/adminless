"use client";

import { useState, useMemo } from 'react';
import { db } from '@/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
    History, 
    ChevronRight, 
    ArrowRightCircle, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    DatabaseZap,
    ShieldCheck
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { showSuccess, showError } from '@/utils/toast';

export const DataRecoveryTool = () => {
  const { years, terms, activeYear, activeTerm, migrateLegacyData } = useAcademic();
  const [selectedYearId, setSelectedYearId] = useState<string>(activeYear?.id || "");
  const [selectedTermId, setSelectedTermId] = useState<string>(activeTerm?.id || "");
  const [isMigrating, setIsMigrating] = useState(false);
  const [candidates, setCandidates] = useState<{ [key: string]: number } | null>(null);

  const scanForLegacyData = async () => {
    const stats: { [key: string]: number } = {};

    const check = async (table: string) => {
        // @ts-ignore
        const items = await db[table].toArray();
        const legacy = items.filter((i: any) => !i.year_id || !i.term_id);
        if (legacy.length > 0) stats[table] = legacy.length;
    };

    const tables = ['classes', 'assessments', 'activities', 'todos', 'learner_notes', 'evidence', 'attendance'];
    await Promise.all(tables.map(t => check(t)));
    
    setCandidates(stats);
  };

  const totalLegacyCount = useMemo(() => 
    candidates ? Object.values(candidates).reduce((a, b) => a + b, 0) : 0
  , [candidates]);

  const handleMigrate = async () => {
    if (!selectedYearId || !selectedTermId) {
        showError("Please select a destination Year and Term.");
        return;
    }

    if (!confirm(`This will link ${totalLegacyCount} legacy records to ${years.find(y => y.id === selectedYearId)?.name} - ${terms.find(t => t.id === selectedTermId)?.name}. This action is permanent and will be logged in your audit trail. Proceed?`)) {
        return;
    }

    setIsMigrating(true);
    
    const report = await migrateLegacyData(selectedYearId, selectedTermId);
    
    if (report.success) {
        showSuccess(`Recovery successful! ${report.total} records have been aligned with your active cycle.`);
        setCandidates(null);
        setTimeout(() => window.location.reload(), 1500);
    } else {
        showError("Migration failed. Please check your data integrity and try again.");
    }
    
    setIsMigrating(false);
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.02] shadow-inner">
      <CardHeader>
        <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Architectural Alignment Engine</CardTitle>
        </div>
        <CardDescription>
          Identify and restore legacy data by assigning missing Academic Year and Term references.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Destination Year</label>
                <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Destination Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Destination Term</label>
                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Destination Term" />
                    </SelectTrigger>
                    <SelectContent>
                        {terms.filter(t => t.year_id === selectedYearId).map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {!candidates ? (
            <Button variant="outline" className="w-full bg-white hover:bg-muted" onClick={scanForLegacyData}>
                <DatabaseZap className="mr-2 h-4 w-4" /> Scan for Architectural Gaps
            </Button>
        ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="p-4 rounded-lg bg-white border shadow-sm">
                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Gaps Found: {totalLegacyCount} records identified
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(candidates).map(([table, count]) => (
                            <div key={table} className="p-2 rounded bg-muted/30 border text-center">
                                <p className="text-xs font-bold">{count}</p>
                                <p className="text-[9px] uppercase text-muted-foreground font-black">{table}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5" />
                    <p className="text-xs text-blue-900 leading-relaxed">
                        <strong>Integrity Verification:</strong> This engine preserves all original timestamps and creates an audit trail entry for this migration. It is safe to run multiple times.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setCandidates(null)}>Cancel</Button>
                    <Button 
                        className="flex-1 bg-primary font-bold shadow-md" 
                        disabled={isMigrating || totalLegacyCount === 0} 
                        onClick={handleMigrate}
                    >
                        {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightCircle className="mr-2 h-4 w-4" />}
                        Run Alignment Script
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};