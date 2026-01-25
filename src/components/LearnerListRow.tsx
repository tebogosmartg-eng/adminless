import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, AlertCircle, AlertOctagon, Calculator, BookText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Learner } from '@/components/CreateClassDialog';
import { GradeSymbol, getGradeSymbol } from '@/utils/grading';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LearnerListRowProps {
  index: number;
  learner: Learner & { originalIndex: number };
  gradingScheme: GradeSymbol[];
  atRiskThreshold: number;
  showComments: boolean;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onMarkChange: (index: number, mark: string) => void;
  onCommentChange: (index: number, comment: string) => void;
  onMarkBlur: (index: number, mark: string) => void;
  onRemoveLearner: (index: number) => void;
  onProfileClick: (learner: Learner) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, originalIndex: number, mark: string) => void;
}

export const LearnerListRow = ({
  index,
  learner,
  gradingScheme,
  atRiskThreshold,
  showComments,
  isSelected,
  onSelect,
  onMarkChange,
  onCommentChange,
  onMarkBlur,
  onRemoveLearner,
  onProfileClick,
  onKeyDown
}: LearnerListRowProps) => {
  const { commentBank } = useSettings();
  
  const gradeSymbol = getGradeSymbol(learner.mark, gradingScheme);
  const markNum = parseFloat(learner.mark);
  const isAtRisk = !isNaN(markNum) && markNum < atRiskThreshold;
  const isInvalid = !isNaN(markNum) && (markNum < 0 || markNum > 100);
  const isCalculated = learner.mark.includes('.') && !learner.mark.endsWith('.0');

  const insertComment = (text: string) => {
    const current = learner.comment || "";
    const newVal = current ? `${current} ${text}` : text;
    onCommentChange(learner.originalIndex, newVal);
  };

  return (
    <TableRow 
      className={cn(
        isAtRisk && "bg-red-50 hover:bg-red-100/80 dark:bg-red-950/20 dark:hover:bg-red-950/30",
        isSelected && "bg-muted/50"
      )}
    >
      <TableCell>
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
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
            onBlur={(e) => onMarkBlur(learner.originalIndex, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index, learner.originalIndex, learner.mark)}
            className={cn(
              "pr-8", 
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
           <div className="relative flex gap-1">
              <Textarea
                value={learner.comment || ''}
                onChange={(e) => onCommentChange(learner.originalIndex, e.target.value)}
                placeholder="Enter comment..."
                className="min-h-[60px] resize-none flex-1 text-xs"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 self-start mt-1">
                    <BookText className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[300px]">
                  <DropdownMenuLabel>Comment Bank</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {commentBank.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">
                      No saved comments. Add them in Settings.
                    </div>
                  ) : (
                    commentBank.map((comment, i) => (
                      <DropdownMenuItem key={i} onClick={() => insertComment(comment)}>
                        <span className="truncate">{comment}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
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
};