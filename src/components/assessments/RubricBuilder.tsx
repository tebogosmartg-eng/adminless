"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Layers, ListTodo } from 'lucide-react';
import { Rubric, RubricCriterion, RubricLevel } from '@/lib/types';
import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';

export const RubricBuilder = ({ onSave }: { onSave?: (rubric: Rubric) => void }) => {
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    {
      id: crypto.randomUUID(),
      title: "Content",
      weight: 10,
      levels: [
        { id: crypto.randomUUID(), label: "Exceptional", points: 10 },
        { id: crypto.randomUUID(), label: "Adequate", points: 5 },
        { id: crypto.randomUUID(), label: "Developing", points: 2 }
      ]
    }
  ]);

  const addCriterion = () => {
    setCriteria([...criteria, {
      id: crypto.randomUUID(),
      title: "New Criterion",
      weight: 10,
      levels: [
        { id: crypto.randomUUID(), label: "Excellent", points: 10 },
        { id: crypto.randomUUID(), label: "Poor", points: 0 }
      ]
    }]);
  };

  const removeCriterion = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const updateCriterion = (id: string, updates: Partial<RubricCriterion>) => {
    setCriteria(criteria.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleSave = async () => {
    if (!title) {
        showError("Please enter a rubric title.");
        return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const totalPoints = criteria.reduce((sum, c) => sum + c.weight, 0);

      const newRubric: Rubric = {
        id: crypto.randomUUID(),
        user_id: user.id,
        title,
        criteria,
        total_points: totalPoints
      };

      await db.rubrics.add(newRubric);
      await queueAction('rubrics', 'create', newRubric);
      
      showSuccess(`Rubric "${title}" saved successfully.`);
      if (onSave) onSave(newRubric);
      
      setTitle("");
      setCriteria([]);
    } catch (e) {
      showError("Failed to save rubric.");
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle>Rubric Designer</CardTitle>
        </div>
        <CardDescription>Create a qualitative marking grid.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Rubric Title</Label>
          <Input 
            placeholder="e.g. Oral Presentation Rubric" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ListTodo className="h-4 w-4" /> Criteria
            </h4>
            <Button variant="outline" size="sm" onClick={addCriterion}>
                <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
          </div>

          <div className="space-y-4">
            {criteria.map((c, idx) => (
              <div key={c.id} className="p-4 border rounded-lg bg-muted/20 space-y-3 relative group">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeCriterion(c.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
                
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3 space-y-1.5">
                        <Label className="text-xs">Criterion Name</Label>
                        <Input 
                            value={c.title} 
                            onChange={(e) => updateCriterion(c.id, { title: e.target.value })}
                            className="h-8"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Max Points</Label>
                        <Input 
                            type="number" 
                            value={c.weight} 
                            onChange={(e) => updateCriterion(c.id, { weight: parseInt(e.target.value) || 0 })}
                            className="h-8"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    {c.levels.map(l => (
                        <Badge key={l.id} variant="secondary" className="px-2 py-1 gap-1">
                            {l.label}: {l.points} pts
                        </Badge>
                    ))}
                    <span className="text-[10px] text-muted-foreground self-center italic">
                        Standard levels (Excellent/Adequate/Poor) applied.
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save Rubric Definition
        </Button>
      </CardContent>
    </Card>
  );
};