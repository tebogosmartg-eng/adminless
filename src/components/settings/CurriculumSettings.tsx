"use client";

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from '@/context/SettingsContext';
import { useAcademic } from '@/context/AcademicContext';
import { BookOpen, Plus, Trash2, GripVertical, ListChecks } from 'lucide-react';
import { queueAction } from '@/services/sync';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

export const CurriculumSettings = () => {
  const { savedSubjects, savedGrades } = useSettings();
  const { activeTerm } = useAcademic();
  
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [newTopic, setNewTopic] = useState("");

  const topics = useLiveQuery(
    () => (subject && grade && activeTerm) 
      ? db.curriculum_topics.where('[subject+grade+term_id]').equals([subject, grade, activeTerm.id]).sortBy('order')
      : [],
    [subject, grade, activeTerm?.id]
  ) || [];

  const handleAddTopic = async () => {
    if (!newTopic.trim() || !activeTerm || !subject || !grade) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        id: crypto.randomUUID(),
        user_id: user.id,
        subject,
        grade,
        term_id: activeTerm.id,
        title: newTopic.trim(),
        order: topics.length + 1
      };

      await db.curriculum_topics.add(payload);
      await queueAction('curriculum_topics', 'create', payload);
      setNewTopic("");
      showSuccess("Topic added to term plan.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    await db.curriculum_topics.delete(id);
    await queueAction('curriculum_topics', 'delete', { id });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <CardTitle>Curriculum Planner</CardTitle>
        </div>
        <CardDescription>Define the topics you intend to cover for each subject this term.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Choose Subject" /></SelectTrigger>
                    <SelectContent>
                        {savedSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Grade</Label>
                <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger><SelectValue placeholder="Choose Grade" /></SelectTrigger>
                    <SelectContent>
                        {savedGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {subject && grade && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Add topic title..." 
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                    />
                    <Button onClick={handleAddTopic} disabled={!newTopic.trim()} size="icon">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="border rounded-lg bg-muted/20 overflow-hidden">
                    {topics.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs italic">
                            No topics defined for this term plan.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {topics.map((t, i) => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-muted-foreground w-4">{i + 1}</span>
                                        <span className="text-sm font-medium">{t.title}</span>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                                        onClick={() => handleDelete(t.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
};