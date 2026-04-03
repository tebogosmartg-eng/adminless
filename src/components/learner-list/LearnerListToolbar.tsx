import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BrainCircuit, Loader2, Trash2, MessageSquare, AlertOctagon, Filter, Calculator } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LearnerListToolbarProps {
  showComments: boolean;
  selectedCount: number;
  isGeneratingComments: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  onGenerateComments: () => void;
  onBatchDelete: () => void;
  onBatchComment: () => void;
  onBatchClearMarks: () => void;
}

export const LearnerListToolbar = ({
  showComments,
  selectedCount,
  isGeneratingComments,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onGenerateComments,
  onBatchDelete,
  onBatchComment,
  onBatchClearMarks
}: LearnerListToolbarProps) => {
  return (
    <CardHeader>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
        <div className="w-full">
          <CardTitle>Learner List {showComments && "& Comments"}</CardTitle>
          <CardDescription>
            {showComments 
              ? "View and edit generated report comments." 
              : "Type marks (e.g. '85' or '17/20')."}
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
          {selectedCount > 0 && (
            <div className="flex items-center justify-between sm:justify-start gap-2 animate-in fade-in slide-in-from-top-1 bg-muted/50 p-1 rounded-md w-full sm:w-auto">
               <span className="text-xs font-medium px-2 flex-1 sm:flex-none whitespace-nowrap">{selectedCount} selected</span>
               <div className="flex items-center gap-1 shrink-0">
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button size="icon" variant="destructive" className="h-8 w-8 shrink-0" onClick={onBatchDelete}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>Delete Selected</TooltipContent>
                   </Tooltip>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={onBatchComment}>
                         <MessageSquare className="h-4 w-4" />
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>Bulk Comment</TooltipContent>
                   </Tooltip>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <Button size="icon" variant="outline" className="h-8 w-8 text-orange-500 shrink-0" onClick={onBatchClearMarks}>
                         <AlertOctagon className="h-4 w-4" />
                       </Button>
                     </TooltipTrigger>
                     <TooltipContent>Clear Marks</TooltipContent>
                   </Tooltip>
               </div>
            </div>
          )}
          
          {showComments && (
            <Button 
              onClick={onGenerateComments} 
              disabled={isGeneratingComments} 
              variant="secondary"
              className="bg-purple-100 text-purple-900 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-100 w-full sm:w-auto h-10"
            >
              {isGeneratingComments ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><BrainCircuit className="mr-2 h-4 w-4" /> AI Auto-Generate</>
              )}
            </Button>
          )}
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
             <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] shrink-0 h-10">
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

            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 pr-8 w-full h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                    <div className="absolute right-2.5 top-3 cursor-help">
                        <Calculator className="h-4 w-4 text-muted-foreground opacity-50 hover:opacity-100" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Smart Entry: Type '17/20' to auto-calculate %</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};