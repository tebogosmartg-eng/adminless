import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Plus } from 'lucide-react';
import { Learner } from '@/lib/types';
import { GradeSymbol } from '@/utils/grading';
import { useSettings } from '@/context/SettingsContext';
import { showSuccess } from '@/utils/toast';
import { useLearnerTable } from '@/hooks/useLearnerTable';
import { LearnerListToolbar } from './LearnerListToolbar';
import { LearnerListRow } from './LearnerListRow';

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
  
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortConfig, requestSort,
    selectedIndices,
    sortedAndFilteredLearners,
    handleSelectAll,
    handleSelectOne,
    clearSelection
  } = useLearnerTable(learners, atRiskThreshold);

  // Smart Input Logic
  const handleMarkBlur = (index: number, currentValue: string) => {
    // Check for "x/y" pattern (e.g. 15/20)
    const fractionMatch = currentValue.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/);
    
    if (fractionMatch) {
      const num = parseFloat(fractionMatch[1]);
      const den = parseFloat(fractionMatch[3]);
      
      if (den !== 0) {
        const percentage = ((num / den) * 100).toFixed(1).replace(/\.0$/, ''); 
        if (percentage !== currentValue) {
           onMarkChange(index, percentage);
           showSuccess(`Calculated: ${num}/${den} = ${percentage}%`);
        }
      }
    }
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

  const executeBatchDelete = () => {
    if (onBatchDelete && selectedIndices.length > 0) {
      if (confirm(`Are you sure you want to delete ${selectedIndices.length} learners?`)) {
        onBatchDelete(selectedIndices);
        clearSelection();
      }
    }
  };

  const executeBatchClearMarks = () => {
    if (onBatchClearMarks && selectedIndices.length > 0) {
       if (confirm(`Clear marks for ${selectedIndices.length} learners?`)) {
        onBatchClearMarks(selectedIndices);
        clearSelection();
      }
    }
  };

  const executeBatchComment = () => {
    if (onBatchComment && selectedIndices.length > 0) {
      const comment = prompt("Enter a comment for selected learners:");
      if (comment !== null) {
        onBatchComment(selectedIndices, comment);
        clearSelection();
      }
    }
  };

  const allSelected = sortedAndFilteredLearners.length > 0 && selectedIndices.length === sortedAndFilteredLearners.length;

  return (
    <Card className="transition-all duration-300">
      <LearnerListToolbar 
        showComments={showComments}
        selectedCount={selectedIndices.length}
        isGeneratingComments={isGeneratingComments}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onGenerateComments={onGenerateComments}
        onBatchDelete={executeBatchDelete}
        onBatchComment={executeBatchComment}
        onBatchClearMarks={executeBatchClearMarks}
      />
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
              sortedAndFilteredLearners.map((learner, index) => (
                <LearnerListRow 
                  key={learner.originalIndex}
                  index={index}
                  learner={learner}
                  gradingScheme={gradingScheme}
                  atRiskThreshold={atRiskThreshold}
                  showComments={showComments}
                  isSelected={selectedIndices.includes(learner.originalIndex)}
                  onSelect={(checked) => handleSelectOne(learner.originalIndex, checked)}
                  onMarkChange={onMarkChange}
                  onCommentChange={onCommentChange}
                  onMarkBlur={handleMarkBlur}
                  onRemoveLearner={onRemoveLearner}
                  onProfileClick={onProfileClick}
                  onKeyDown={handleKeyDown}
                />
              ))
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