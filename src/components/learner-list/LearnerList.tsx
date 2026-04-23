import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Loader2, Plus } from 'lucide-react';
import { Learner, GradeSymbol } from '@/lib/types';
import { useSettings } from '@/context/SettingsContext';
import { showSuccess } from '@/utils/toast';
import { useLearnerTable } from '@/hooks/useLearnerTable';
import { LearnerListToolbar } from './LearnerListToolbar';
import { LearnerListRow } from './LearnerListRow';
import { parseMarkInput } from '@/utils/marks';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface LearnerListProps {
  learners: Learner[];
  showComments: boolean;
  gradingScheme: GradeSymbol[];
  isGeneratingComments: boolean;
  onGenerateComments: () => void;
  onMarkChange: (index: number, mark: string) => void;
  onCommentChange: (index: number, comment: string) => void;
  onRenameLearner: (index: number, name: string) => void;
  onRemoveLearner: (index: number) => void;
  onProfileClick: (learner: Learner) => void;
  onAddLearnerClick: () => void;
  onBatchDelete?: (indices: number[]) => void;
  onBatchComment?: (indices: number[], comment: string) => void;
  onBatchClearMarks?: (indices: number[]) => void;
  isLoading?: boolean;
}

export const LearnerList = ({
  learners,
  showComments,
  gradingScheme,
  isGeneratingComments,
  onGenerateComments,
  onMarkChange,
  onCommentChange,
  onRenameLearner,
  onRemoveLearner,
  onProfileClick,
  onAddLearnerClick,
  onBatchDelete,
  onBatchComment,
  onBatchClearMarks,
  isLoading = false
}: LearnerListProps) => {
  const { atRiskThreshold } = useSettings();
  const [hasResolvedInitialLoad, setHasResolvedInitialLoad] = useState(!isLoading);

  useEffect(() => {
    if (!isLoading) {
      setHasResolvedInitialLoad(true);
    }
  }, [isLoading]);
  
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
    const { value, isCalculated, raw } = parseMarkInput(currentValue);
    
    if (isCalculated && value !== currentValue) {
       onMarkChange(index, value);
       showSuccess(`Calculated: ${raw} = ${value}%`);
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

  const showInitialSkeleton = isLoading && !hasResolvedInitialLoad;
  const showRefreshOverlay = isLoading && hasResolvedInitialLoad;

  if (showInitialSkeleton) {
    return (
      <Card className="transition-all duration-300 w-full overflow-hidden">
        <div className="p-6 border-b space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-10 w-full sm:w-36" />
            <Skeleton className="h-10 w-full sm:w-52" />
          </div>
        </div>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto w-full no-scrollbar max-w-[calc(100vw-2.5rem)] md:max-w-full">
            <Table className="min-w-[600px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-2 sm:px-4"><Skeleton className="h-4 w-4" /></TableHead>
                  <TableHead className="w-[50px] px-2"><Skeleton className="h-4 w-4" /></TableHead>
                  <TableHead className="min-w-[150px]"><Skeleton className="h-4 w-32" /></TableHead>
                  <TableHead className="w-[100px] sm:w-[120px]"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="w-[80px] sm:w-[100px]"><Skeleton className="h-4 w-14" /></TableHead>
                  {showComments && <TableHead><Skeleton className="h-4 w-20" /></TableHead>}
                  <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={`learner-list-skeleton-${idx}`}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-5" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    {showComments && <TableCell><Skeleton className="h-8 w-full rounded-md" /></TableCell>}
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative transition-all duration-300 w-full overflow-hidden">
      {showRefreshOverlay && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-background/45 backdrop-blur-[1px]">
          <div className="flex justify-end p-3">
            <div className="inline-flex items-center gap-2 rounded-md border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating learners...
            </div>
          </div>
        </div>
      )}
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
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto w-full no-scrollbar max-w-[calc(100vw-2.5rem)] md:max-w-full">
          <Table className="min-w-[600px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] px-2 sm:px-4">
                  <Checkbox 
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[50px] px-2">#</TableHead>
                <TableHead className="min-w-[150px]">
                  <Button variant="ghost" onClick={() => requestSort('name')} className="pl-0 hover:pl-2 transition-all text-xs sm:text-sm h-8">
                    Learner Name
                    {sortConfig.key === 'name' && <ArrowUpDown className="ml-2 h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px] sm:w-[120px]">
                   <Button variant="ghost" onClick={() => requestSort('mark')} className="pl-0 hover:pl-2 transition-all text-xs sm:text-sm h-8">
                    Mark
                    {sortConfig.key === 'mark' && <ArrowUpDown className="ml-2 h-3 w-3" />}
                  </Button>
                </TableHead>
                <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm">Symbol</TableHead>
                {showComments && (
                   <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('comment')} className="h-8 text-xs sm:text-sm">
                      Comment
                      {sortConfig.key === 'comment' && <ArrowUpDown className="ml-2 h-3 w-3" />}
                    </Button>
                   </TableHead>
                )}
                <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
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
                    onRenameLearner={onRenameLearner}
                    onMarkBlur={handleMarkBlur}
                    onRemoveLearner={onRemoveLearner}
                    onProfileClick={onProfileClick}
                    onKeyDown={handleKeyDown}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={showComments ? 7 : 6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                       {statusFilter !== 'all' || searchQuery ? (
                         <p className="text-muted-foreground">No learners match your filters.</p>
                       ) : (
                         <>
                           <p className="text-muted-foreground">This class is empty.</p>
                           <Button variant="outline" onClick={onAddLearnerClick} className="text-xs sm:text-sm">
                              <Plus className="mr-2 h-4 w-4" /> Add Learners
                           </Button>
                         </>
                       )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {sortedAndFilteredLearners.length > 0 && (
            <div className="p-4 sm:p-0 sm:pt-4 border-t mt-0 sm:mt-4 flex justify-center">
                <Button variant="outline" onClick={onAddLearnerClick} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Learner
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};