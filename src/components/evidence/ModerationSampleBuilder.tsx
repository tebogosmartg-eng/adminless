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
    FileCheck
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

  const sampleLearners = useMemo(() => {
      return classInfo.learners
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
  }, [classInfo.learners, selectedLearnerIds, evidenceList, basis, assessmentId, assessments, marks]);

  const completionCount = sampleLearners.filter(l => l.hasEvidence).length;

  return (
    <Card className="border-primary/20 bg-primary/[0.01] shadow-none">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Moderation Sample Builder</CardTitle>
                </div>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                    Recommended sample: 10% of class (min 3)
                </CardDescription>
            </div>
            {selectedLearnerIds.length > 0 && (
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Evidence Status</p>
                    <Badge variant={completionCount === sampleLearners.length ? "default" : "outline"} className={cn(
                        "h-5 px-2",
                        completionCount === sampleLearners.length && "bg-green-600 border-none"
                    )}>
                        {completionCount} / {sampleLearners.length} Linked
                    </Badge>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid gap-4 p-4 rounded-xl border bg-background shadow-sm">
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
                {['top', 'mid', 'bottom', 'random'].map(key => (
                    <div key={key} className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">{key} N</Label>
                        <Input 
                            type="number" 
                            className="h-8 text-center font-bold"
                            value={rules[key as keyof typeof rules]}
                            onChange={(e) => setRules({ ...rules, [key]: parseInt(e.target.value) || 0 })}
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
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Users className="h-3 w-3" /> Selected Group ({selectedLearnerIds.length})
                    </h4>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] uppercase font-black" onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Edit3 className="h-3 w-3 mr-1" />}
                            {isEditing ? "Finish Editing" : "Edit Selection"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSave} className="h-6 gap-1 px-2 border-primary text-primary text-[9px] font-black uppercase">
                            <Save className="h-3 w-3" /> Save Selection
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2">
                    {isEditing ? (
                        <div className="p-3 border rounded-xl bg-background max-h-[300px] overflow-y-auto">
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
                        <div className="grid gap-2">
                            {sampleLearners.map((l) => (
                                <div key={l.id} className="flex items-center justify-between p-3 rounded-xl border bg-background group hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        {l.hasEvidence ? (
                                            <div className="p-1.5 rounded-full bg-green-100 text-green-700"><FileCheck className="h-3.5 w-3.5" /></div>
                                        ) : (
                                            <div className="p-1.5 rounded-full bg-amber-50 text-amber-600"><AlertCircle className="h-3.5 w-3.5" /></div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{l.name}</span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{l.score.toFixed(1)}% ({basis === 'assessment' ? 'Task' : 'Term'})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {l.hasEvidence ? (
                                            <Badge variant="outline" className="h-5 text-[8px] uppercase border-green-200 text-green-700 bg-green-50/50">Complete</Badge>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => onUploadForLearner(l)} className="h-7 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 gap-1.5">
                                                <FileUp className="h-3 w-3" /> Attach Script
                                            </Button>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
                                            onClick={() => l.id && toggleLearner(l.id)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {!selectedLearnerIds.length && (
            <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5 flex flex-col items-center gap-3">
                <Target className="h-8 w-8 text-muted-foreground opacity-20" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sample Not Defined</p>
                    <p className="text-[9px] text-muted-foreground max-w-[200px] mx-auto">Use the controls above to automatically pick a representative sample for this term.</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};