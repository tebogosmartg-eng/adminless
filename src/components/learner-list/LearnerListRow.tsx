import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, AlertCircle, AlertOctagon, Calculator, BookText, MoreVertical, User, Edit2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '@/utils/grading';
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
  onRenameLearner: (index: number, name: string) => void;
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
  onRenameLearner,
  onMarkBlur,
  onRemoveLearner,
  onProfileClick,
  onKeyDown
}: LearnerListRowProps) => {
  const { commentBank } = useSettings();
  
  const gradeSymbol = getGradeSymbol(learner.mark, gradingScheme);
  const markNum = parseFloat(learner.mark);
  
  const isAtRisk = !isNaN(markNum) && markNum < atRiskThreshold && markNum > 0;
  const isInvalid = !isNaN(markNum) && (markNum < 0 || markNum > 100);
  const isCalculated = learner.mark.includes('.') && !learner.mark.endsWith('.0');

  const insertComment = (text: string) => {
    const current = learner.comment || "";
    const newVal = current ? `${current} ${text}` : text;
    onCommentChange(learner.originalIndex, newVal);
  };

  const handleRename = () => {
    const newName = prompt("Enter new name for student:", learner.name);
    if (newName && newName.trim() && newName !== learner.name) {
        onRenameLearner(learner.originalIndex, newName.trim());
    }
  };

  return (
    <TableRow 
      className={cn(
        "group transition-colors",
        isAtRisk && "bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20",
        isSelected && "bg-muted/80"
      )}
    >
      <TableCell className="py-2 px-4">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
        />
      </TableCell>
      <TableCell className="text-[10px] font-mono text-muted-foreground opacity-50 py-2 px-2">{index + 1}</TableCell>
      <TableCell className="py-2">
         <div className="flex items-center gap-2">
           <button 
            className="text-sm font-medium hover:underline text-left text-foreground/90 truncate max-w-[180px]"
            onClick={() => onProfileClick(learner)}
           >
            {learner.name}
           </button>
           {isAtRisk && (
             <Tooltip>
               <TooltipTrigger>
                 <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
               </TooltipTrigger>
               <TooltipContent>
                 <p className="text-xs">Needs attention: Mark below {atRiskThreshold}%</p>
               </TooltipContent>
             </Tooltip>
           )}
         </div>
      </TableCell>
      <TableCell className="py-2">
        <div className="relative flex items-center">
          <Input
            id={`mark-input-${index}`}
            type="text" 
            inputMode="decimal"
            placeholder="-"
            value={learner.mark}
            onChange={(e) => onMarkChange(learner.originalIndex, e.target.value)}
            onBlur={(e) => onMarkBlur(learner.originalIndex, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index, learner.originalIndex, learner.mark)}
            className={cn(
              "h-8 w-20 text-center font-medium pr-6 bg-transparent", 
              isAtRisk && "border-amber-200 focus-visible:ring-amber-400",
              isInvalid && "border-red-300 focus-visible:ring-red-500"
            )}
          />
           {isCalculated && (
             <div className="absolute right-1.5 opacity-30">
               <Calculator className="h-3 w-3" />
             </div>
           )}
        </div>
      </TableCell>
      <TableCell className="py-2">
        {gradeSymbol && (
          <Badge variant="outline" className={cn("text-[10px] font-semibold tracking-tighter px-1.5 py-0 h-5", gradeSymbol.badgeColor)}>
            {gradeSymbol.symbol} (L{gradeSymbol.level})
          </Badge>
        )}
      </TableCell>
      {showComments && (
        <TableCell className="py-2 min-w-[200px]">
           <div className="relative flex gap-1 items-center">
              <Textarea
                value={learner.comment || ''}
                onChange={(e) => onCommentChange(learner.originalIndex, e.target.value)}
                placeholder="Teacher observation..."
                className="min-h-[50px] resize-none flex-1 text-xs bg-muted/20 border-muted focus:bg-background transition-all"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                    <BookText className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[280px]">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Observation Bank</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {commentBank.map((comment, i) => (
                    <DropdownMenuItem key={i} onClick={() => insertComment(comment)} className="text-xs">
                      <span className="truncate">{comment}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
           </div>
        </TableCell>
      )}
      <TableCell className="py-2 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onProfileClick(learner)}>
                    <User className="mr-2 h-4 w-4" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRename}>
                    <Edit2 className="mr-2 h-4 w-4" /> Rename Student
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRemoveLearner(learner.originalIndex)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Remove from Class
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};