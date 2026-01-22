import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useClasses } from '../context/ClassesContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Save, Mic, Upload, ArrowUpDown, Users, MoreHorizontal, Search, BrainCircuit, MessageSquare, Loader2, Plus, Trash2 } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { showSuccess, showError } from '@/utils/toast';
import { VoiceEntryDialog } from '@/components/VoiceEntryDialog';
import { ImportMarksDialog } from '@/components/ImportMarksDialog';
import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/MarkDistributionChart';
import { EditLearnersDialog } from '@/components/EditLearnersDialog';
import { AiInsightsDialog } from '@/components/AiInsightsDialog';
import { generateClassInsights, generateReportComments, ClassInsight } from '@/services/gemini';
import { Textarea } from '@/components/ui/textarea';
import { getGradeSymbol } from '@/utils/grading';
import { useSettings } from '@/context/SettingsContext';
import { LearnerProfileDialog } from '@/components/LearnerProfileDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type SortDirection = 'ascending' | 'descending';
type SortKey = keyof Learner;

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const ClassDetails = () => {
  const { classId } = useParams<{ classId: string }>();
  const { classes, updateLearners } = useClasses();
  const { gradingScheme } = useSettings();
  const classInfo = classes.find((c) => c.id === classId);

  const [learners, setLearners] = useState<Learner[]>([]);
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditLearnersOpen, setIsEditLearnersOpen] = useState(false);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
  
  // Profile View State
  const [selectedProfileLearner, setSelectedProfileLearner] = useState<Learner | null>(null);
  
  // Add Learner State
  const [newLearnerName, setNewLearnerName] = useState("");

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Insights State
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<ClassInsight | null>(null);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  useEffect(() => {
    if (classInfo) {
      setLearners(classInfo.learners);
    }
  }, [classInfo]);

  useEffect(() => {
    if (classInfo) {
      const original = JSON.stringify(classInfo.learners);
      const current = JSON.stringify(learners);
      setHasUnsavedChanges(original !== current);
    }
  }, [learners, classInfo]);

  const sortedAndFilteredLearners = useMemo(() => {
    const filtered = learners
      .map((learner, index) => ({ ...learner, originalIndex: index }))
      .filter(learner => learner.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key!] || '';
        const bVal = b[sortConfig.key!] || '';
        let comparison = 0;

        if (sortConfig.key === 'mark') {
          const parseMark = (mark: string) => {
            if (!mark || mark.trim() === '') return -Infinity;
            const num = parseFloat(mark);
            return isNaN(num) ? -Infinity : num;
          };
          const numA = parseMark(aVal);
          const numB = parseMark(bVal);
          if (numA > numB) comparison = 1;
          else if (numA < numB) comparison = -1;
        } else { // name or comment
          if (aVal.toString().toLowerCase() > bVal.toString().toLowerCase()) comparison = 1;
          else if (aVal.toString().toLowerCase() < bVal.toString().toLowerCase()) comparison = -1;
        }
        return sortConfig.direction === 'descending' ? comparison * -1 : comparison;
      });
    }
    return filtered;
  }, [learners, sortConfig, searchQuery]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleMarkChange = (index: number, mark: string) => {
    const updatedLearners = [...learners];
    updatedLearners[index] = { ...updatedLearners[index], mark };
    setLearners(updatedLearners);
  };

  const handleCommentChange = (index: number, comment: string) => {
    const updatedLearners = [...learners];
    updatedLearners[index] = { ...updatedLearners[index], comment };
    setLearners(updatedLearners);
  };
  
  const handleRemoveLearner = (index: number) => {
    if (confirm("Are you sure you want to remove this learner?")) {
      const updatedLearners = learners.filter((_, i) => i !== index);
      setLearners(updatedLearners);
      // We don't save immediately to allow "Save Changes" to be the final commit
    }
  };

  const handleAddLearner = () => {
    if (newLearnerName.trim()) {
      setLearners([...learners, { name: newLearnerName.trim(), mark: "" }]);
      setNewLearnerName("");
      setIsAddLearnerOpen(false);
      showSuccess("Learner added to the list. Remember to save changes.");
    }
  };

  const handleSaveChanges = () => {
    if (classId) {
      updateLearners(classId, learners);
      showSuccess("Changes have been saved successfully!");
      setInsights(null); 
    }
  };

  const handleUpdateAndSaveLearners = (updatedLearners: Learner[]) => {
    setLearners(updatedLearners);
    if (classId) {
      updateLearners(classId, updatedLearners);
      setInsights(null);
    }
  };

  const handleExport = () => {
    if (!classInfo) {
      showError("Could not find class information to export.");
      return;
    }

    const csvHeader = "Learner Name,Mark,Symbol,Level,Comment\n";
    const csvRows = learners
      .map(learner => {
        const gradeSymbol = getGradeSymbol(learner.mark, gradingScheme);
        const symbol = gradeSymbol?.symbol || '';
        const level = gradeSymbol?.level || '';
        return `"${learner.name.replace(/"/g, '""')}",${learner.mark},${symbol},${level},"${(learner.comment || '').replace(/"/g, '""')}"`;
      })
      .join("\n");
    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const filename = `${classInfo.grade}_${classInfo.subject}_${classInfo.className}_Marks.csv`.replace(/\s+/g, '_');
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("Data exported successfully!");
    } else {
      showError("Export feature is not supported in your browser.");
    }
  };

  const handleGenerateInsights = async () => {
    if (!classInfo) return;
    
    const hasMarks = learners.some(l => l.mark && l.mark.trim() !== "");
    if (!hasMarks) {
      showError("Please enter some marks before generating insights.");
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const result = await generateClassInsights(classInfo.subject, classInfo.grade, learners);
      setInsights(result);
    } catch (error) {
      console.error(error);
      showError("Failed to generate insights. Check API Key in settings.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateComments = async () => {
    if (!classInfo) return;
    
    const hasMarks = learners.some(l => l.mark && l.mark.trim() !== "");
    if (!hasMarks) {
      showError("Please enter marks before generating comments.");
      return;
    }

    setIsGeneratingComments(true);
    setShowComments(true);
    
    try {
      const comments = await generateReportComments(classInfo.subject, classInfo.grade, learners);
      
      const updatedLearners = learners.map(learner => {
        const generated = comments.find(c => c.name === learner.name);
        if (generated) {
          return { ...learner, comment: generated.comment };
        }
        return learner;
      });

      setLearners(updatedLearners);
      showSuccess(`Generated comments for ${comments.length} learners.`);
    } catch (error) {
      console.error(error);
      showError("Failed to generate comments. Check API Key in settings.");
    } finally {
      setIsGeneratingComments(false);
    }
  };

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Class not found</h2>
        <p className="text-muted-foreground mt-2">The class you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link to="/classes">Back to Classes</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link to="/classes" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Link>
          <h1 className="text-3xl font-bold">{classInfo.subject} - {classInfo.className}</h1>
          <p className="text-muted-foreground">{classInfo.grade}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => setIsAiInsightsOpen(true)}
          >
            <BrainCircuit className="mr-2 h-4 w-4" /> Insights
          </Button>
          <Button 
            variant="outline" 
            className={showComments ? "bg-muted" : ""}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> {showComments ? 'Hide Comments' : 'Comments'}
          </Button>
          <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges}>
            <Save className="mr-2 h-4 w-4" />
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
          <Button variant="outline" onClick={() => setIsVoiceEntryOpen(true)}>
            <Mic className="mr-2 h-4 w-4" /> Voice
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsAddLearnerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Add Single Learner</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditLearnersOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                <span>Bulk Manage</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Import CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export CSV</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!showComments && (
        <>
          <ClassStats learners={learners} />
          <MarkDistributionChart learners={learners} />
        </>
      )}

      <Card className="transition-all duration-300">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Learner List {showComments && "& Comments"}</CardTitle>
              <CardDescription>
                {showComments 
                  ? "View and edit generated report comments." 
                  : "Enter marks below, or click a name to view profile."}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {showComments && (
                <Button 
                  onClick={handleGenerateComments} 
                  disabled={isGeneratingComments} 
                  variant="secondary"
                  className="bg-purple-100 text-purple-900 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-100"
                >
                  {isGeneratingComments ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><BrainCircuit className="mr-2 h-4 w-4" /> AI Auto-Generate</>
                  )}
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search learners..."
                  className="pl-8 sm:w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[250px]">
                  <Button variant="ghost" onClick={() => requestSort('name')}>
                    Learner Name
                    {sortConfig.key === 'name' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                   <Button variant="ghost" onClick={() => requestSort('mark')}>
                    Mark
                    {sortConfig.key === 'mark' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">Symbol</TableHead>
                {showComments && (
                   <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('comment')}>
                      Comment
                      {sortConfig.key === 'comment' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                    </Button>
                   </TableHead>
                )}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredLearners.length > 0 ? (
                sortedAndFilteredLearners.map((learner, index) => {
                  const gradeSymbol = getGradeSymbol(learner.mark, gradingScheme);
                  return (
                    <TableRow key={learner.originalIndex}>
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                         <button 
                          className="font-medium hover:underline text-left"
                          onClick={() => setSelectedProfileLearner(learner)}
                         >
                          {learner.name}
                         </button>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="%"
                          value={learner.mark}
                          onChange={(e) => handleMarkChange(learner.originalIndex, e.target.value)}
                          className=""
                        />
                      </TableCell>
                      <TableCell>
                        {gradeSymbol && (
                          <Badge variant="outline" className={gradeSymbol.badgeColor}>
                            {gradeSymbol.symbol} (L{gradeSymbol.level})
                          </Badge>
                        )}
                      </TableCell>
                      {showComments && (
                        <TableCell>
                          <Textarea
                            value={learner.comment || ''}
                            onChange={(e) => handleCommentChange(learner.originalIndex, e.target.value)}
                            placeholder="Enter a comment or generate with AI..."
                            className="min-h-[60px] resize-none"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveLearner(learner.originalIndex)}
                         >
                            <Trash2 className="h-4 w-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={showComments ? 6 : 5} className="h-24 text-center">
                    No learners found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="pt-4 border-t mt-4 flex justify-center">
             <Button variant="outline" onClick={() => setIsAddLearnerOpen(true)} className="w-full sm:w-auto">
               <Plus className="mr-2 h-4 w-4" /> Add Learner
             </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isAddLearnerOpen} onOpenChange={setIsAddLearnerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Learner</DialogTitle>
            <DialogDescription>
              Enter the full name of the learner to add to this class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Learner Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. John Doe" 
                value={newLearnerName}
                onChange={(e) => setNewLearnerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLearner()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddLearner}>Add Learner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <VoiceEntryDialog 
        isOpen={isVoiceEntryOpen}
        onOpenChange={setIsVoiceEntryOpen}
        learners={learners}
        onComplete={handleUpdateAndSaveLearners}
      />
      <ImportMarksDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        classInfo={classInfo}
        onImportComplete={handleUpdateAndSaveLearners}
      />
      <EditLearnersDialog
        isOpen={isEditLearnersOpen}
        onOpenChange={setIsEditLearnersOpen}
        classInfo={classInfo}
      />
      <AiInsightsDialog
        isOpen={isAiInsightsOpen}
        onOpenChange={setIsAiInsightsOpen}
        isLoading={isGeneratingInsights}
        insights={insights}
        onGenerate={handleGenerateInsights}
      />
      <LearnerProfileDialog
        isOpen={!!selectedProfileLearner}
        onOpenChange={(open) => !open && setSelectedProfileLearner(null)}
        learner={selectedProfileLearner}
        classSubject={`${classInfo.grade} ${classInfo.subject}`}
      />
    </>
  );
};

export default ClassDetails;