import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Search, BrainCircuit, Loader2, Plus, Trash2, AlertCircle, AlertOctagon, Filter } from 'lucide-react';
import { Learner } from '@/components/CreateClassDialog';
import { GradeSymbol, getGradeSymbol } from '@/utils/grading';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/context/SettingsContext';

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
  onAddLearnerClick
}: LearnerListProps) => {
  const { atRiskThreshold } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

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

  return (
    <Card className="transition-all duration-300">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle>Learner List {showComments && "& Comments"}</CardTitle>
            <CardDescription>
              {showComments 
                ? "View and edit generated report comments." 
                : "Enter marks below, or click a name to view profile."}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
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

                return (
                  <TableRow 
                    key={learner.originalIndex} 
                    className={cn(isAtRisk && "bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-950/30")}
                  >
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
                      <Input
                        type="number"
                        placeholder="%"
                        value={learner.mark}
                        onChange={(e) => onMarkChange(learner.originalIndex, e.target.value)}
                        className={cn(
                          isAtRisk && "border-red-300 focus-visible:ring-red-500",
                          isInvalid && "border-orange-300 focus-visible:ring-orange-500"
                        )}
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
                <TableCell colSpan={showComments ? 6 : 5} className="h-24 text-center text-muted-foreground">
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