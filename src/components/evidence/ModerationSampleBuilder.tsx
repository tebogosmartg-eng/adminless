"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { 
    Sparkles, 
    ShieldCheck, 
    Users, 
    Target, 
    Save, 
    Edit3, 
    CheckCircle2, 
    AlertCircle, 
    Plus, 
    X,
    Loader2,
    FileUp,
    FileCheck,
    TrendingUp,
    TrendingDown,
    Minus
} from 'lucide-react';
import { useModerationSample } from '@/hooks/useModerationSample';
import { ClassInfo, Assessment, AssessmentMark, Learner, Evidence } from '@/lib/types';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';

interface ModerationSampleBuilderProps {
  classInfo: ClassInfo;
  assessments: Assessment[];
  marks: AssessmentMark[];
  evidenceList: Evidence[];
  onUploadForLearner: (learner: Learner) => void;
}

export const ModerationSampleBuilder = ({ 
  classInfo, 
  assessments, 
  marks, 
  evidenceList,
  onUploadForLearner 
}: ModerationSampleBuilderProps) => {
  const { sample, generateSample, saveSample, loading } = useModerationSample(
    classInfo.year_id, 
    classInfo.term_id, 
    classInfo.id
  );

  const [basis, setBasis] = useState<'term_overall' | 'assessment'>('term_overall');
  const [assessmentId, setAssessmentId] = useState<string>("none");
  const [rules, setRules] = useState({ top: 3, mid: 3, bottom: 3, random: 0 });
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (sample) {
      setBasis(sample.rules_json.basis);
      setAssessmentId(sample.assessment_id || "none");
      setRules({
        top: sample.rules_json.top,
        mid: sample.rules_json.mid,
        bottom: sample.rules_json.bottom,
        random: sample.rules_json.random
      });
      setSelectedLearnerIds(sample.learner_ids);
    }
  }, [sample]);

  const handleAutoSet10Percent = () => {
    const total = classInfo.learners.length;
    const target = Math.max(3, Math.ceil(total * 0.1));
    const perGroup = Math.floor(target / 3);
    const remainder = target % 3;

    setRules({
      top: perGroup + (remainder > 0 ? 1 : 0),
      mid: perGroup + (remainder > 1 ? 1 : 0),
      bottom: perGroup,
      random: 0
    });
    showSuccess(`Rules adjusted for ${target} learners (10% sample).`);
  };

  const handleGenerate = async () => {
    const ids = await generateSample(
      basis,
      assessmentId === 'none' ? null : assessmentId,
      rules,
      classInfo.learners,
      assessments,
      marks
    );
    setSelectedLearnerIds(ids);
    setIsEditing(false);
    showSuccess(`Generated sample of ${ids.length} learners.`);
  };

  const toggleLearner = (lId: string) => {
    setSelectedLearnerIds(prev => 
      prev.includes(lId) ? prev.filter(id => id !== lId) : [...prev, lId]
    );
  };

  const handleSave = () => {
    saveSample(
        selectedLearnerIds, 
        basis, 
        assessmentId === 'none' ? null : assessmentId, 
        rules
    );
  };

  // Grouping Logic for results
  const groupedLearners = useMemo(() => {
      const selected = classInfo.learners
        .filter(l => l.id && selectedLearnerIds.includes(l.id))
        .map(l => {
            const hasEvidence = evidenceList.some(e => e.learner_id === l.id);
            let score = 0;
            if (basis === 'assessment' && assessmentId !== 'none') {
                const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === l.id);
                const ass = assessments.find(a => a.id === assessmentId);
                if (m && m.score !== null && ass) score = (m.score / ass.max_mark) * 100;
            } else {
                score = parseFloat(l.mark) || 0;
            }
            return { ...l, hasEvidence, score };
        })
        .sort((a, b) => b.score - a.score);

      // Divide the sorted selection into groups based on the rules that picked them
      // If manually edited, we just divide by count
      const high = selected.slice(0, rules.top);
      const low = selected.slice(-rules.bottom);
      
      const middleIds = new Set(selected.map(l => l.id));
      high.forEach(l => middleIds.delete(l.id!));
      low.forEach(l => middleIds.delete(l.id!));
      
      const moderate = selected.filter(l => middleIds.has(l.id!));

      return { high, moderate, low, total: selected.length };
  }, [classInfo.learners, selectedLearnerIds, evidenceList, basis, assessmentId, assessments, marks, rules]);

  const completionCount = [...groupedLearners.high, ...groupedLearners.moderate, ...groupedLearners.low].filter(l => l.hasEvidence).length;

  const AchievementGroup = ({ title, learners, icon: Icon, colorClass }: any) => {
    if (learners.length === 0) return null;
    return (
        <div className="space-y-2 print:mb-4">
            <div className="flex items-center gap-2 px-1 print:border-b print:border-slate-300 print:pb-1">
                <Icon className={cn("h-3 w-3 no-print", colorClass)} />
                <span className={cn("text-[10px] font-black uppercase tracking-widest", colorClass, "print:text-slate-800")}>
                    {title} Achievement
                </span>
                <span className="text-[10px] font-bold text-muted-foreground opacity-40 print:hidden">({learners.length})</span>
            </div>
            <div className="grid gap-2 print:gap-0">
                {learners.map((l: any) => (
                    <div key={l.id} className={cn(
                        "flex items-center justify-between p-3 rounded-xl border bg-background group hover:border-primary/30 transition-all",
                        "print:border-none print:p-1.5 print:border-b print:border-slate-100 print:rounded-none",
                        l.hasEvidence ? "border-green-100 print:bg-transparent" : "border-slate-100 print:bg-transparent"
                    )}>
                        <div className="flex items-center gap-3 w-full">
                            <div className={cn(
                                "p-1.5 rounded-lg no-print",
                                l.hasEvidence ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                            )}>
                                {l.hasEvidence ? <FileCheck className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            </div>
                            
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex justify-between items-center w-full">
                                    <span className="text-sm font-bold text-slate-900 truncate max-w-[150px] print:text-black print:text-xs">{l.name}</span>
                                    <span className="hidden print:block text-[9px] font-bold uppercase text-slate-500">
                                        {l.hasEvidence ? "Evidence Attached" : "Pending Submission"}
                                    </span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter print:text-slate-400">
                                    {l.score.toFixed(1)}% {basis === 'assessment' ? 'Task' : 'Term'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 no-print shrink-0">
                            {!l.hasEvidence ? (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => onUploadForLearner(l)} 
                                    className="h-7 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 gap-1.5 no-print"
                                >
                                    <FileUp className="h-3 w-3" /> Attach Script
                                </Button>
                            ) : (
                                <Badge variant="outline" className="h-5 text-[8px] uppercase font-black border-green-200 text-green-700 bg-green-50/50">Stored</Badge>
                            )}
                            <button 
                                onClick={() => l.id && toggleLearner(l.id)}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 no-print"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.01] shadow-none print:shadow-none print:border-none print:bg-transparent print-avoid-break">
      <CardHeader className="pb-3 print:px-0">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary no-print" />
                    <CardTitle className="text-base print:text-black">
                        <span className="no-print">Moderation Sample Builder</span>
                        <span className="hidden print:inline">Moderation Sample Breakdown</span>
                    </CardTitle>
                </div>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest no-print">
                    Recommended sample: 10% of class (min 3)
                </CardDescription>
                {sample && (
                    <p className="hidden print:block text-[10px] uppercase text-slate-500 font-bold mt-1">
                        Basis: {sample.rules_json.basis === 'term_overall' ? 'Term Overall Average' : 'Specific Task Performance'}
                    </p>
                )}
            </div>
            {selectedLearnerIds.length > 0 && (
                <div className="text-right no-print">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Evidence Status</p>
                    <Badge variant={completionCount === selectedLearnerIds.length ? "default" : "outline"} className={cn(
                        "h-5 px-2",
                        completionCount === selectedLearnerIds.length && "bg-green-600 border-none"
                    )}>
                        {completionCount} / {selectedLearnerIds.length} Linked
                    </Badge>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 print:px-0">
        {/* Controls */}
        <div className="grid gap-4 p-4 rounded-xl border bg-background shadow-sm no-print">
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black">Sampling Basis</Label>
                    <Select value={basis} onValueChange={(v: any) => setBasis(v)}>
                        <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="term_overall">Term Overall Average</SelectItem>
                            <SelectItem value="assessment">Specific Assessment Task</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {basis === 'assessment' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-[10px] uppercase font-black">Choose Task</Label>
                        <Select value={assessmentId} onValueChange={setAssessmentId}>
                            <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Select Assessment --</SelectItem>
                                {assessments.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { key: 'top', label: 'High', icon: TrendingUp, color: 'text-green-600' },
                    { key: 'mid', label: 'Moderate', icon: Minus, color: 'text-blue-600' },
                    { key: 'bottom', label: 'Low', icon: TrendingDown, color: 'text-red-600' },
                    { key: 'random', label: 'Random', icon: Sparkles, color: 'text-purple-600' }
                ].map(opt => (
                    <div key={opt.key} className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <opt.icon className={cn("h-2.5 w-2.5", opt.color)} /> {opt.label}
                        </Label>
                        <Input 
                            type="number" 
                            className="h-8 text-center font-bold"
                            value={rules[opt.key as keyof typeof rules]}
                            onChange={(e) => setRules({ ...rules, [opt.key]: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button onClick={handleGenerate} disabled={loading} size="sm" className="flex-1 font-bold">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Generate Smart Sample
                </Button>
                <Button variant="outline" size="sm" onClick={handleAutoSet10Percent} className="h-8 text-[10px] font-black uppercase tracking-tighter">
                    Auto-Set 10% Rule
                </Button>
            </div>
        </div>

        {/* Results / List */}
        {selectedLearnerIds.length > 0 && (
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2 no-print">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Users className="h-3 w-3" /> Audit Selection ({selectedLearnerIds.length})
                    </h4>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-black" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Edit3 className="h-3 w-3 mr-1" />}
                            {isEditing ? "Finish Editing" : "Edit Selection"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSave} className="h-6 gap-1 px-2 border-primary text-primary text-[9px] font-black uppercase">
                            <Save className="h-3 w-3" /> Save Sample
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 print:gap-4">
                    {isEditing ? (
                        <div className="p-3 border rounded-xl bg-background max-h-[350px] overflow-y-auto shadow-inner no-print">
                            <div className="grid grid-cols-2 gap-2">
                                {classInfo.learners.map(l => (
                                    <button 
                                        key={l.id}
                                        onClick={() => l.id && toggleLearner(l.id)}
                                        className={cn(
                                            "p-2 rounded-lg border text-left text-[11px] font-bold transition-all flex items-center justify-between",
                                            selectedLearnerIds.includes(l.id!) ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent text-muted-foreground opacity-60"
                                        )}
                                    >
                                        <span className="truncate pr-2">{l.name}</span>
                                        {selectedLearnerIds.includes(l.id!) ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500 print:space-y-4">
                            <AchievementGroup 
                                title="High" 
                                learners={groupedLearners.high} 
                                icon={TrendingUp} 
                                colorClass="text-green-600" 
                            />
                            <AchievementGroup 
                                title="Moderate" 
                                learners={groupedLearners.moderate} 
                                icon={Minus} 
                                colorClass="text-blue-600" 
                            />
                            <AchievementGroup 
                                title="Low" 
                                learners={groupedLearners.low} 
                                icon={TrendingDown} 
                                colorClass="text-red-600" 
                            />
                        </div>
                    )}
                </div>
            </div>
        )}

        {!selectedLearnerIds.length && (
            <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-3 print:border-none print:bg-transparent print:text-left print:p-2">
                <Target className="h-8 w-8 text-muted-foreground opacity-20 no-print" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground no-print">Sample Not Defined</p>
                    <p className="text-[9px] text-muted-foreground max-w-[200px] mx-auto no-print">Use the controls above to automatically pick a representative sample for this term.</p>
                    <p className="hidden print:block text-sm text-slate-800 font-medium">No formal moderation sample generated for this period.</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};