"use client";

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Layers, 
    Plus, 
    Trash2, 
    FileText, 
    ChevronLeft, 
    Search,
    AlertCircle
} from 'lucide-react';
import { RubricBuilder } from '@/components/assessments/RubricBuilder';
import { queueAction } from '@/services/sync';
import { showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input';

export const RubricLibrary = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  
  const rubrics = useLiveQuery(() => 
    db.rubrics.toArray()
  ) || [];

  const filteredRubrics = rubrics.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete the rubric "${title}"?`)) {
        await db.rubrics.delete(id);
        await queueAction('rubrics', 'delete', { id });
        showSuccess("Rubric removed from library.");
    }
  };

  if (isCreating) {
    return (
        <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back to Library
            </Button>
            <RubricBuilder onSave={() => setIsCreating(false)} />
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>Rubric Library</CardTitle>
            </div>
            <Button onClick={() => setIsCreating(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Rubric
            </Button>
        </div>
        <CardDescription>
          Design qualitative marking grids to use for projects, presentations, and practicals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search rubrics..." 
                className="pl-9" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        {rubrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <FileText className="h-10 w-10 text-muted-foreground opacity-20 mb-3" />
                <p className="text-sm font-medium">Your library is empty.</p>
                <p className="text-xs text-muted-foreground mb-4">Create your first rubric to start qualitative marking.</p>
                <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
                    Create First Rubric
                </Button>
            </div>
        ) : filteredRubrics.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm italic">
                No rubrics matching "{search}"
            </div>
        ) : (
            <div className="grid gap-3 sm:grid-cols-2">
                {filteredRubrics.map((rubric) => (
                    <div key={rubric.id} className="group p-4 rounded-lg border bg-card hover:border-primary/50 transition-all flex flex-col justify-between h-32">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm truncate max-w-[150px]">{rubric.title}</h4>
                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-[9px] h-4 uppercase">
                                        {rubric.criteria.length} Criteria
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] h-4">
                                        {rubric.total_points} Pts
                                    </Badge>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(rubric.id, rubric.title)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <AlertCircle className="h-3 w-3" />
                            <span>Linked assessments will be unaffected if deleted.</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
};