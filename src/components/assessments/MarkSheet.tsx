import { useEffect, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcademic } from '@/context/AcademicContext';
import { Learner, ClassInfo } from '@/lib/types';
import { Plus, Trash2, AlertCircle, Save, Eye, Calendar } from 'lucide-react';
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
    terms,
    activeTerm, 
    activeYear,
    assessments, 
    marks, 
    createAssessment, 
    deleteAssessment, 
    refreshAssessments,
    updateMarks
  } = useAcademic();

  const [viewTermId, setViewTermId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});

  // Set default view to active term on mount
  useEffect(() => {
    if (activeTerm && !viewTermId) {
        setViewTermId(activeTerm.id);
    }
  }, [activeTerm]);

  // Fetch data when viewTermId changes
  useEffect(() => {
    if (viewTermId) {
        refreshAssessments(classInfo.id, viewTermId);
        setEditedMarks({}); // Clear unsaved edits when switching terms
    }
  }, [viewTermId, classInfo.id]);

  const currentViewTerm = terms.find(t => t.id === viewTermId);
  const totalWeight = useMemo(() => assessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [assessments]);
  const isWeightValid = totalWeight === 100;
  
  // Lock editing if:
  // 1. The viewed term is closed
  // 2. The year is closed
  // 3. We are viewing a term that is NOT the active working term (historical review)
  const isLocked = currentViewTerm?.closed || activeYear?.closed || (activeTerm && viewTermId !== activeTerm.id);

  const getMarkValue = (assessmentId: string, learnerId: string) => {
     const key = `${assessmentId}-${learnerId}`;
     if (key in editedMarks) return editedMarks[key];
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
          if (viewTermId) refreshAssessments(classInfo.id, viewTermId);
      }
  };

  const handleAddAssessment = async () => {
     if (!viewTermId) return;
     await createAssessment({
         class_id: classInfo.id,
         term_id: viewTermId,
         title: newAss.title,
         type: newAss.type,
         max_mark: Number(newAss.max),
         weight: Number(newAss.weight),
         date: newAss.date || new Date().toISOString()
     });
     setIsAddOpen(false);
     setNewAss({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  };

  const calculateLearnerTotal = (learnerId: string) => {
      let weightedSum = 0;
      assessments.forEach(ass => {
          const val = getMarkValue(ass.id, learnerId);
          if (val !== "") {
              const score = parseFloat(val);
              const weighted = (score / ass.max_mark) * ass.weight;
              weightedSum += weighted;
          }
      });
      return weightedSum.toFixed(1);
  };

  if (!currentViewTerm) {
      return <div className="p-8 text-center text-muted-foreground">Please configure an Active Academic Year and Term in Settings.</div>;
  }

  return (
    <div className="space-y-4">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
           <div className="space-y-2">
               <div className="flex items-center gap-2">
                   <Select value={viewTermId || ""} onValueChange={setViewTermId}>
                       <SelectTrigger className="w-[180px] h-9">
                           <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                           <SelectValue placeholder="Select Term" />
                       </SelectTrigger>
                       <SelectContent>
                           {terms.map(t => (
                               <SelectItem key={t.id} value={t.id}>
                                   {t.name} {t.id === activeTerm?.id ? "(Active)" : ""}
                               </SelectItem>
                           ))}
                       </SelectContent>
                   </Select>
                   
                   {currentViewTerm.closed && <Badge variant="secondary"><Eye className="mr-1 h-3 w-3" /> Read Only</Badge>}
                   {activeYear?.closed && <Badge variant="destructive">Year Finalized</Badge>}
               </div>
               
               <div className="flex items-center gap-2 text-sm">
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
                           <DialogTitle>New Assessment Activity ({currentViewTerm.name})</DialogTitle>
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
           {assessments.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground bg-muted/10">
                   No assessments found for {currentViewTerm.name}.
               </div>
           ) : (
               <Table>
                   <TableHeader>
                       <TableRow>
                           <TableHead className="w-[200px] sticky left-0 bg-background z-10 shadow-sm">Learner</TableHead>
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
                               <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-sm">
                                   {learner.name}
                               </TableCell>
                               {assessments.map(ass => (
                                   <TableCell key={ass.id} className="p-1">
                                       <div className="flex justify-center">
                                           <Input 
                                               className={`h-8 w-16 text-center ${isLocked ? "bg-muted cursor-not-allowed" : ""}`}
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
           )}
       </div>
    </div>
  );
};