import { useEffect, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcademic } from '@/context/AcademicContext';
import { Learner, ClassInfo } from '@/lib/types';
import { Plus, Trash2, AlertCircle, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MarkSheetProps {
  classInfo: ClassInfo;
}

export const MarkSheet = ({ classInfo }: MarkSheetProps) => {
  const { 
    activeTerm, 
    activeYear,
    assessments, 
    marks, 
    createAssessment, 
    deleteAssessment, 
    refreshAssessments,
    updateMarks
  } = useAcademic();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  
  // Local state for edits before save
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (activeTerm) {
        refreshAssessments(classInfo.id);
    }
  }, [activeTerm, classInfo.id]);

  const totalWeight = useMemo(() => assessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [assessments]);
  const isWeightValid = totalWeight === 100;
  
  const isLocked = activeTerm?.closed || activeYear?.closed;

  const getMarkValue = (assessmentId: string, learnerId: string) => {
     // Check local edits first
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedMarks) return editedMarks[key];

     // Fallback to saved marks
     const m = marks.find(m => m.assessment_id === assessmentId && m.learner_id === learnerId);
     return m?.score?.toString() || "";
  };

  const handleMarkChange = (assessmentId: string, learnerId: string, value: string) => {
     if (isLocked) return;
     setEditedMarks(prev => ({ ...prev, [`${assessmentId}-${learnerId}`]: value }));
  };

  const handleSaveMarks = async () => {
      const updates = Object.entries(editedMarks).map(([key, value]) => {
          const [assessmentId, learnerId] = key.split('-');
          const score = value === "" ? null : parseFloat(value);
          return { assessment_id: assessmentId, learner_id: learnerId, score };
      });

      if (updates.length > 0) {
          await updateMarks(updates);
          setEditedMarks({});
          refreshAssessments(classInfo.id);
      }
  };

  const handleAddAssessment = async () => {
     if (!activeTerm) return;
     await createAssessment({
         class_id: classInfo.id,
         term_id: activeTerm.id,
         title: newAss.title,
         type: newAss.type,
         max_mark: Number(newAss.max),
         weight: Number(newAss.weight),
         date: newAss.date || new Date().toISOString()
     });
     setIsAddOpen(false);
     setNewAss({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  };

  // Logic: Calculate Term Mark
  const calculateLearnerTotal = (learnerId: string) => {
      let weightedSum = 0;
      let totalWeightSoFar = 0;

      assessments.forEach(ass => {
          const val = getMarkValue(ass.id, learnerId);
          if (val !== "") {
              const score = parseFloat(val);
              const weighted = (score / ass.max_mark) * ass.weight;
              weightedSum += weighted;
              totalWeightSoFar += ass.weight;
          }
      });
      
      // If weights don't sum to 100 yet, this is a running total.
      // Final mark is just the sum of weighted parts.
      return weightedSum.toFixed(1);
  };

  if (!activeTerm) {
      return <div className="p-8 text-center text-muted-foreground">Please configure an Active Academic Year and Term in Settings.</div>;
  }

  return (
    <div className="space-y-4">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
           <div>
               <h3 className="text-lg font-semibold flex items-center gap-2">
                   {activeTerm.name} Assessment Plan
                   {activeTerm.closed && <Badge variant="secondary">Term Closed</Badge>}
                   {activeYear?.closed && <Badge variant="destructive">Year Finalized</Badge>}
               </h3>
               <div className="flex items-center gap-2 text-sm mt-1">
                   <span className={isWeightValid ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                       Total Weighting: {totalWeight}%
                   </span>
                   {!isWeightValid && (
                       <Tooltip>
                           <TooltipTrigger><AlertCircle className="h-4 w-4 text-amber-500" /></TooltipTrigger>
                           <TooltipContent>Weights must sum to 100% for correct final calculation.</TooltipContent>
                       </Tooltip>
                   )}
               </div>
           </div>
           <div className="flex gap-2">
               <Button onClick={handleSaveMarks} disabled={Object.keys(editedMarks).length === 0 || !!isLocked}>
                   <Save className="mr-2 h-4 w-4" /> Save Marks
               </Button>
               <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                   <DialogTrigger asChild>
                       <Button variant="outline" disabled={!!isLocked}>
                           <Plus className="mr-2 h-4 w-4" /> Add Assessment
                       </Button>
                   </DialogTrigger>
                   <DialogContent>
                       <DialogHeader>
                           <DialogTitle>New Assessment Activity</DialogTitle>
                       </DialogHeader>
                       <div className="grid gap-4 py-4">
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label className="text-right">Title</Label>
                               <Input value={newAss.title} onChange={e => setNewAss({...newAss, title: e.target.value})} className="col-span-3" placeholder="e.g. Algebra Test" />
                           </div>
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label className="text-right">Type</Label>
                               <Select value={newAss.type} onValueChange={v => setNewAss({...newAss, type: v})}>
                                   <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                   <SelectContent>
                                       <SelectItem value="Test">Test</SelectItem>
                                       <SelectItem value="Exam">Exam</SelectItem>
                                       <SelectItem value="Assignment">Assignment</SelectItem>
                                       <SelectItem value="Project">Project</SelectItem>
                                   </SelectContent>
                               </Select>
                           </div>
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label className="text-right">Max Mark</Label>
                               <Input type="number" value={newAss.max} onChange={e => setNewAss({...newAss, max: parseInt(e.target.value)})} className="col-span-3" />
                           </div>
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label className="text-right">Weight (%)</Label>
                               <Input type="number" value={newAss.weight} onChange={e => setNewAss({...newAss, weight: parseFloat(e.target.value)})} className="col-span-3" />
                           </div>
                           <div className="grid grid-cols-4 items-center gap-4">
                               <Label className="text-right">Date</Label>
                               <Input type="date" value={newAss.date} onChange={e => setNewAss({...newAss, date: e.target.value})} className="col-span-3" />
                           </div>
                           <Button onClick={handleAddAssessment}>Create</Button>
                       </div>
                   </DialogContent>
               </Dialog>
           </div>
       </div>

       <div className="border rounded-md overflow-x-auto">
           <Table>
               <TableHeader>
                   <TableRow>
                       <TableHead className="w-[200px] sticky left-0 bg-background z-10">Learner</TableHead>
                       {assessments.map(ass => (
                           <TableHead key={ass.id} className="text-center min-w-[120px]">
                               <div className="flex flex-col items-center">
                                   <span className="font-semibold">{ass.title}</span>
                                   <span className="text-xs text-muted-foreground font-normal">
                                       {ass.max_mark} marks • {ass.weight}%
                                   </span>
                                   {!isLocked && (
                                       <Button variant="ghost" size="icon" className="h-5 w-5 mt-1 text-muted-foreground hover:text-destructive" onClick={() => deleteAssessment(ass.id)}>
                                           <Trash2 className="h-3 w-3" />
                                       </Button>
                                   )}
                               </div>
                           </TableHead>
                       ))}
                       <TableHead className="text-center font-bold bg-muted/30 min-w-[100px]">
                           Term Total <br/> %
                       </TableHead>
                   </TableRow>
               </TableHeader>
               <TableBody>
                   {classInfo.learners.map(learner => (
                       <TableRow key={learner.id || learner.name}>
                           <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                               {learner.name}
                           </TableCell>
                           {assessments.map(ass => (
                               <TableCell key={ass.id} className="p-1">
                                   <div className="flex justify-center">
                                       <Input 
                                           className={`h-8 w-16 text-center ${isLocked ? "bg-muted" : ""}`}
                                           value={getMarkValue(ass.id, learner.id || '')}
                                           onChange={(e) => learner.id && handleMarkChange(ass.id, learner.id, e.target.value)}
                                           disabled={!learner.id || !!isLocked}
                                           placeholder="-"
                                       />
                                   </div>
                               </TableCell>
                           ))}
                           <TableCell className="text-center font-bold bg-muted/30">
                               {learner.id ? calculateLearnerTotal(learner.id) : '-'}
                           </TableCell>
                       </TableRow>
                   ))}
               </TableBody>
           </Table>
       </div>
    </div>
  );
};