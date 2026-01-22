import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Search, BrainCircuit, Loader2, Plus, Trash2, AlertCircle, AlertOctagon, Filter, Calculator, CheckSquare, MessageSquare } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { GradeSymbol, getGradeSymbol } from '@/utils/grading';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/context/SettingsContext';
import { showSuccess } from '@/utils/toast';

type SortDirection = 'ascending' | 'descending';
type SortKey = keyof Learner;

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface LearnerListProps {
  learners: Learner[];
  showComments: boolean;
  gradingScheme: GradeSymbol[];
  isGeneratingComments: boolean;
  onGenerateComments: () => void;
  onMarkChange: (index: number, mark: string) => void;
  onCommentChange: (index: number, comment: string) => void;
  onRemoveLearner: (index: number) => void;
  onProfileClick: (learner: Learner) => void;
  onAddLearnerClick: () => void;
  onBatchDelete?: (indices: number[]) => void;
  onBatchComment?: (indices: number[], comment: string) => void;
  onBatchClearMarks?: (indices: number[]) => void;
}

export const LearnerList = ({
  learners,
  showComments,
  gradingScheme,
  isGeneratingComments,
  onGenerateComments,
  onMarkChange,
  onCommentChange,
  onRemoveLearner,
  onProfileClick,
  onAddLearnerClick,
  onBatchDelete,
  onBatchComment,
  onBatchClearMarks
}: LearnerListProps) => {
  const { atRiskThreshold } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Smart Input Logic
  const handleMarkBlur = (index: number, currentValue: string) => {
    // Check for "x/y" pattern (e.g. 15/20)
    const fractionMatch = currentValue.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/);
    
    if (fractionMatch) {
      const num = parseFloat(fractionMatch[1]);
      const den = parseFloat(fractionMatch[3]);
      
      if (den !== 0) {
        const percentage = ((num / den) * 100).toFixed(1).replace(/\.0$/, ''); // remove trailing .0 if integer
        if (percentage !== currentValue) {
           onMarkChange(index, percentage);
           showSuccess(`Calculated: ${num}/${den} = ${percentage}%`);
        }
      }
    }
  };

  const sortedAndFilteredLearners = useMemo(() => {
    const filtered = learners
      .map((learner, index) => ({ ...learner, originalIndex: index }))
      .filter(learner => {
        // Search Filter
        const matchesSearch = learner.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status Filter
        let matchesStatus = true;
        const markNum = parseFloat(learner.mark);
        const hasMark = !isNaN(markNum);
        
        if (statusFilter === 'at-risk') {
          matchesStatus = hasMark && markNum < atRiskThreshold;
        } else if (statusFilter === 'passing') {
          matchesStatus = hasMark && markNum >= atRiskThreshold;
        } else if (statusFilter === 'missing') {
           matchesStatus = !hasMark || learner.mark === '';
        }

        return matchesSearch && matchesStatus;
      });

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
  }, [learners, sortConfig, searchQuery, statusFilter, atRiskThreshold]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, originalIndex: number, currentValue: string) => {
    if (e.key === 'Enter') {
       e.preventDefault();
       handleMarkBlur(originalIndex, currentValue);
       
       const nextInput = document.getElementById(`mark-input-${currentIndex + 1}`);
       if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
       }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`mark-input-${currentIndex + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
        (nextInput as HTMLInputElement).select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`mark-input-${currentIndex - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
        (prevInput as HTMLInputElement).select();
      }
    }
  };

  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = sortedAndFilteredLearners.map(l => l.originalIndex);
      setSelectedIndices(allIndices);
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectOne = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedIndices(prev => [...prev, index]);
    } else {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    }
  };

  const executeBatchDelete = () => {
    if (onBatchDelete && selectedIndices.length > 0) {
      if (confirm(`Are you sure you want to delete ${selectedIndices.length} learners?`)) {
        onBatchDelete(selectedIndices);
        setSelectedIndices([]);
      }
    }
  };

  const executeBatchClearMarks = () => {
    if (onBatchClearMarks && selectedIndices.length > 0) {
       if (confirm(`Clear marks for ${selectedIndices.length} learners?`)) {
        onBatchClearMarks(selectedIndices);
        setSelectedIndices([]);
      }
    }
  };

  const executeBatchComment = () => {
    if (onBatchComment && selectedIndices.length > 0) {
      const comment = prompt("Enter a comment for selected learners:");
      if (comment !== null) {
        onBatchComment(selectedIndices, comment);
        setSelectedIndices([]);
      }
    }
  };

  const allSelected = sortedAndFilteredLearners.length > 0 && selectedIndices.length === sortedAndFilteredLearners.length;

  return (
    <Card className="transition-all duration-300">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Learner List {showComments && "& Comments"}</CardTitle>
            <CardDescription>
              {showComments 
                ? "View and edit generated report comments." 
                : "Type marks (e.g. '85' or '17/20')."}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedIndices.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 bg-muted/50 p-1 rounded-md">
                 <span className="text-xs font-medium px-2">{selectedIndices.length} selected</span>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button size="icon" variant="destructive" className="h-8 w-8" onClick={executeBatchDelete}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Delete Selected</TooltipContent>
                 </Tooltip>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button size="icon" variant="outline" className="h-8 w-8" onClick={executeBatchComment}>
                       <MessageSquare className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Bulk Comment</TooltipContent>
                 </Tooltip>
                 <Tooltip>
                   <TooltipTrigger asChild>
                     <Button size="icon" variant="outline" className="h-8 w-8 text-orange-500" onClick={executeBatchClearMarks}>
                       <AlertOctagon className="h-4 w-4" />
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent>Clear Marks</TooltipContent>
                 </Tooltip>
              </div>
            )}
            
            {showComments && (
              <Button 
                onClick={onGenerateComments} 
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
            
            <div className="flex items-center gap-2">
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Learners</SelectItem>
                  <SelectItem value="passing">Passing</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                  <SelectItem value="missing">Missing Mark</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 sm:w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="min-w-[200px]">
                <Button variant="ghost" onClick={() => requestSort('name')} className="pl-0 hover:pl-2 transition-all">
                  Learner Name
                  {sortConfig.key === 'name' && <ArrowUpDown className="ml-2 h-3 w-3" />}
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">
                 <Button variant="ghost" onClick={() => requestSort('mark')} className="pl-0 hover:pl-2 transition-all">
                  Mark
                  {sortConfig.key === 'mark' && <ArrowUpDown className="ml-2 h-3 w-3" />}
                </Button>
              </TableHead>
              <TableHead className="w-[100px]">Symbol</TableHead>
              {showComments && (
                 <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('comment')}>
                    Comment
                    {sortConfig.key === 'comment' && <ArrowUpDown className="ml-2 h-3 w-3" />}
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
                const markNum = parseFloat(learner.mark);
                const isAtRisk = !isNaN(markNum) && markNum < atRiskThreshold;
                const isInvalid = !isNaN(markNum) && (markNum < 0 || markNum > 100);
                const isCalculated = learner.mark.includes('.') && !learner.mark.endsWith('.0');
                const isSelected = selectedIndices.includes(learner.originalIndex);

                return (
                  <TableRow 
                    key={learner.originalIndex} 
                    className={cn(
                      isAtRisk && "bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-950/30",
                      isSelected && "bg-muted/50"
                    )}
                  >
                    <TableCell>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(learner.originalIndex, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <button 
                          className="font-medium hover:underline text-left"
                          onClick={() => onProfileClick(learner)}
                         >
                          {learner.name}
                         </button>
                         {isAtRisk && (
                           <Tooltip>
                             <TooltipTrigger>
                               <AlertCircle className="h-4 w-4 text-red-500" />
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>At Risk: Mark below {atRiskThreshold}%</p>
                             </TooltipContent>
                           </Tooltip>
                         )}
                         {isInvalid && (
                           <Tooltip>
                             <TooltipTrigger>
                               <AlertOctagon className="h-4 w-4 text-orange-500" />
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>Warning: Mark appears to be outside 0-100 range.</p>
                             </TooltipContent>
                           </Tooltip>
                         )}
                       </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          id={`mark-input-${index}`}
                          type="text" 
                          inputMode="decimal"
                          placeholder="%"
                          value={learner.mark}
                          onChange={(e) => onMarkChange(learner.originalIndex, e.target.value)}
                          onBlur={(e) => handleMarkBlur(learner.originalIndex, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, learner.originalIndex, learner.mark)}
                          className={cn(
                            "pr-8", // Make room for calculator icon if needed
                            isAtRisk && "border-red-300 focus-visible:ring-red-500",
                            isInvalid && "border-orange-300 focus-visible:ring-orange-500"
                          )}
                        />
                         {isCalculated && (
                           <div className="absolute right-2 top-2.5 pointer-events-none opacity-50">
                             <Calculator className="h-3 w-3" />
                           </div>
                         )}
                      </div>
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
                          onChange={(e) => onCommentChange(learner.originalIndex, e.target.value)}
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
                        onClick={() => onRemoveLearner(learner.originalIndex)}
                       >
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={showComments ? 7 : 6} className="h-24 text-center text-muted-foreground">
                  {statusFilter !== 'all' || searchQuery 
                    ? "No learners match your filters." 
                    : "No learners in this class yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        <div className="pt-4 border-t mt-4 flex justify-center">
           <Button variant="outline" onClick={onAddLearnerClick} className="w-full sm:w-auto">
             <Plus className="mr-2 h-4 w-4" /> Add Learner
           </Button>
        </div>
      </CardContent>
    </Card>
  );
};