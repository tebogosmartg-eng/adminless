import { useEffect, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcademic } from '@/context/AcademicContext';
import { Learner, ClassInfo, Assessment } from '@/lib/types';
import { Plus, Trash2, AlertCircle, Save, Eye, Calendar, Search, TrendingUp, ArrowDown, ArrowUp, Upload, BarChart2, FileSpreadsheet, Settings2, MoreHorizontal, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { AssessmentImportDialog } from './AssessmentImportDialog';
import { AssessmentAnalyticsDialog } from './AssessmentAnalyticsDialog';
import { CopyAssessmentsDialog } from './CopyAssessmentsDialog';
import { showSuccess, showError } from '@/utils/toast';

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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  
  const [newAss, setNewAss] = useState({ title: "", type: "Test", max: 50, weight: 10, date: "" });
  const [editedMarks, setEditedMarks] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // View Options State
  const [visibleAssessmentIds, setVisibleAssessmentIds] = useState<string[]>([]);
  const [recalculateTotal, setRecalculateTotal] = useState(false);
  
  // Analytics State
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

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
        setEditedMarks({}); 
    }
  }, [viewTermId, classInfo.id]);

  // Initialize visibility when assessments load
  useEffect(() => {
    setVisibleAssessmentIds(assessments.map(a => a.id));
  }, [assessments]);

  const currentViewTerm = terms.find(t => t.id === viewTermId);
  
  // Determine visible assessments
  const visibleAssessments = useMemo(() => 
    assessments.filter(a => visibleAssessmentIds.includes(a.id)), 
  [assessments, visibleAssessmentIds]);

  const totalWeight = useMemo(() => assessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [assessments]);
  const visibleWeight = useMemo(() => visibleAssessments.reduce((acc, curr) => acc + Number(curr.weight), 0), [visibleAssessments]);
  
  // Total calculation logic
  const isUsingVisibleTotal = recalculateTotal && visibleAssessments.length !== assessments.length;
  const currentTotalWeight = isUsingVisibleTotal ? visibleWeight : totalWeight;
  const isWeightValid = currentTotalWeight === 100;
  
  const isLocked = currentViewTerm?.closed || activeYear?.closed || (activeTerm && viewTermId !== activeTerm.id);

  // Filter learners
  const filteredLearners = useMemo(() => {
    return classInfo.learners.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classInfo.learners, searchQuery]);

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

  const handleBulkImport = async (assessmentId: string, importedMarks: { learnerId: string; score: number }[]) => {
      const updates = importedMarks.map(m => ({
          assessment_id: assessmentId,
          learner_id: m.learnerId,
          score: m.score
      }));
      await updateMarks(updates);
      if (viewTermId) refreshAssessments(classInfo.id, viewTermId);
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
      const targetAssessments = isUsingVisibleTotal ? visibleAssessments : assessments;
      
      targetAssessments.forEach(ass => {
          const val = getMarkValue(ass.id, learnerId);
          if (val !== "") {
              const score = parseFloat(val);
              const weighted = (score / ass.max_mark) * ass.weight;
              weightedSum += weighted;
          }
      });
      return weightedSum.toFixed(1);
  };

  const getAssessmentStats = (assessmentId: string) => {
      const values = classInfo.learners.map(l => {
          if (!l.id) return null;
          const val = getMarkValue(assessmentId, l.id);
          return val !== "" ? parseFloat(val) : null;
      }).filter(v => v !== null) as number[];

      if (values.length === 0) return { avg: '-', max: '-', min: '-' };

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = (sum / values.length).toFixed(1);
      const max = Math.max(...values);
      const min = Math.min(...values);

      return { avg, max, min };
  };

  const openAnalytics = (ass: Assessment) => {
      setSelectedAssessment(ass);
      setAnalyticsOpen(true);
  };

  const handleExportSheet = () => {
    if (!classInfo.learners.length) {
        showError("No learners to export.");
        return;
    }

    try {
        // Export only visible columns if recalculateTotal is true, otherwise all
        const exportAssessments = isUsingVisibleTotal ? visibleAssessments : assessments;
        
        const assessmentHeaders = exportAssessments.map(a => `"${a.title} (${a.max_mark})"`);
        const header = ["Learner Name", ...assessmentHeaders, `Total (${currentTotalWeight}%)`].join(",");

        const rows = classInfo.learners.map(l => {
            if (!l.id) return "";
            const marksData = exportAssessments.map(a => {
                const m = getMarkValue(a.id, l.id!);
                return m || "";
            });
            const total = calculateLearnerTotal(l.id);
            return [`"${l.name}"`, ...marksData, total].join(",");
        });

        const csvContent = [header, ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const filename = `${classInfo.className}_${currentViewTerm?.name}_Marks.csv`.replace(/\s+/g, '_');
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess("Mark sheet exported to CSV.");
    } catch (e) {
        console.error(e);
        showError("Failed to export mark sheet.");
    }
  };

  const toggleAssessmentVisibility = (id: string) => {
    setVisibleAssessmentIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  };

  if (!currentViewTerm) {
      return <div className="p-8 text-center text-muted-foreground">Please configure an Active Academic Year and Term in Settings.</div>;
  }

  return (
    <div className="space-y-4">
       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b pb-4">
           <div className="space-y-2">
               <div className="flex flex-wrap items-center gap-2">
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
                       Weighting: {currentTotalWeight}%
                   </span>
                   {!isWeightValid && (
                       <Tooltip>
                           <TooltipTrigger><AlertCircle className="h-4 w-4 text-amber-500" /></TooltipTrigger>
                           <TooltipContent>
                               {isUsingVisibleTotal 
                                 ? "Displayed total represents only visible columns." 
                                 : "Weights must sum to 100% for correct final calculation."}
                           </TooltipContent>
                       </Tooltip>
                   )}
               </div>
           </div>

           <div className="flex flex-1 flex-wrap justify-end gap-2 w-full xl:w-auto">
               <div className="relative w-full md:w-48">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                        placeholder="Search learner..." 
                        className="pl-8" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                   />
               </div>

               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10">
                        <Settings2 className="mr-2 h-4 w-4" /> View Options
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Visible Assessments</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {assessments.map(ass => (
                        <DropdownMenuCheckboxItem 
                            key={ass.id} 
                            checked={visibleAssessmentIds.includes(ass.id)}
                            onCheckedChange={() => toggleAssessmentVisibility(ass.id)}
                        >
                            {ass.title}
                        </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                    <div className="p-2 flex items-center justify-between">
                        <Label htmlFor="recalc-toggle" className="text-xs">Calc. Visible Only</Label>
                        <Switch 
                            id="recalc-toggle" 
                            checked={recalculateTotal} 
                            onCheckedChange={setRecalculateTotal}
                            className="scale-75"
                        />
                    </div>
                  </DropdownMenuContent>
               </DropdownMenu>

               <Button onClick={handleSaveMarks} disabled={Object.keys(editedMarks).length === 0 || !!isLocked}>
                   <Save className="mr-2 h-4 w-4" /> Save
               </Button>
               
               <Button variant="outline" size="icon" onClick={handleExportSheet} title="Export to CSV">
                   <FileSpreadsheet className="h-4 w-4" />
               </Button>

               {!isLocked && (
                   <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                           <Button variant="outline">
                               <Plus className="mr-2 h-4 w-4" /> Add / Import
                           </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => setIsAddOpen(true)}>
                               <Plus className="mr-2 h-4 w-4" /> New Assessment
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => setIsCopyOpen(true)}>
                               <Copy className="mr-2 h-4 w-4" /> Copy Structure...
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                               <Upload className="mr-2 h-4 w-4" /> Import Marks CSV
                           </DropdownMenuItem>
                       </DropdownMenuContent>
                   </DropdownMenu>
               )}

               <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
                   {!isLocked && (
                       <div className="mt-4">
                           <Button variant="outline" onClick={() => setIsAddOpen(true)}>Create Assessment</Button>
                       </div>
                   )}
               </div>
           ) : (
               <Table>
                   <TableHeader>
                       <TableRow>
                           <TableHead className="w-[200px] sticky left-0 bg-background z-10 shadow-sm">
                                <div className="flex items-center gap-2">
                                    Learner
                                    <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
                                        {filteredLearners.length}
                                    </Badge>
                                </div>
                           </TableHead>
                           {visibleAssessments.map(ass => (
                               <TableHead key={ass.id} className="text-center min-w-[140px]">
                                   <div className="flex flex-col items-center group relative">
                                       <div className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={() => openAnalytics(ass)}>
                                           <span className="font-semibold truncate max-w-[100px]" title={ass.title}>{ass.title}</span>
                                           <BarChart2 className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100" />
                                       </div>
                                       <span className="text-xs text-muted-foreground font-normal">
                                           {ass.max_mark} marks • {ass.weight}%
                                       </span>
                                       {!isLocked && (
                                           <DropdownMenu>
                                               <DropdownMenuTrigger asChild>
                                                   <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-5 w-5 mt-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 top-0" 
                                                   >
                                                       <MoreHorizontal className="h-3 w-3" />
                                                   </Button>
                                               </DropdownMenuTrigger>
                                               <DropdownMenuContent>
                                                   <DropdownMenuItem onClick={() => { deleteAssessment(ass.id); }}>
                                                       <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                   </DropdownMenuItem>
                                               </DropdownMenuContent>
                                           </DropdownMenu>
                                       )}
                                   </div>
                               </TableHead>
                           ))}
                           <TableHead className="text-center font-bold bg-muted/30 min-w-[100px]">
                               {isUsingVisibleTotal && <span className="text-[10px] font-normal block text-muted-foreground">(Visible)</span>}
                               Total <br/> %
                           </TableHead>
                       </TableRow>
                   </TableHeader>
                   <TableBody>
                       {filteredLearners.map(learner => (
                           <TableRow key={learner.id || learner.name}>
                               <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-sm">
                                   {learner.name}
                               </TableCell>
                               {visibleAssessments.map(ass => (
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
                       
                       <TableRow className="bg-muted/50 border-t-2 border-muted">
                           <TableCell className="font-bold sticky left-0 bg-muted/95 z-10 border-r text-muted-foreground">
                               <div className="flex items-center gap-2">
                                   <TrendingUp className="h-4 w-4" /> Class Stats
                               </div>
                           </TableCell>
                           {visibleAssessments.map(ass => {
                               const stats = getAssessmentStats(ass.id);
                               return (
                                   <TableCell key={ass.id} className="text-center p-2">
                                       <div className="flex flex-col text-xs space-y-1 cursor-pointer hover:bg-muted/80 rounded" onClick={() => openAnalytics(ass)}>
                                           <div className="font-semibold text-foreground">Avg: {stats.avg}</div>
                                           <div className="flex justify-center gap-2 text-muted-foreground text-[10px]">
                                               <span className="flex items-center text-green-600" title="Highest">
                                                   <ArrowUp className="h-2 w-2 mr-0.5" />{stats.max}
                                               </span>
                                               <span className="flex items-center text-red-600" title="Lowest">
                                                   <ArrowDown className="h-2 w-2 mr-0.5" />{stats.min}
                                               </span>
                                           </div>
                                       </div>
                                   </TableCell>
                               );
                           })}
                           <TableCell className="bg-muted/30"></TableCell>
                       </TableRow>
                   </TableBody>
               </Table>
           )}
       </div>

       <AssessmentImportDialog 
          open={isImportOpen} 
          onOpenChange={setIsImportOpen} 
          assessments={assessments} 
          learners={classInfo.learners} 
          onImport={handleBulkImport}
       />

       <AssessmentAnalyticsDialog 
          open={analyticsOpen} 
          onOpenChange={setAnalyticsOpen} 
          assessment={selectedAssessment} 
          marks={marks} 
          learners={classInfo.learners} 
       />

       {viewTermId && (
         <CopyAssessmentsDialog
            open={isCopyOpen}
            onOpenChange={setIsCopyOpen}
            currentClassId={classInfo.id}
            currentTermId={viewTermId}
            onSuccess={() => refreshAssessments(classInfo.id, viewTermId)}
         />
       )}
    </div>
  );
};