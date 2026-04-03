import { ArrowLeft, Save, MoreVertical, Mic, Zap, Users, Brain, Sliders, Upload, Edit, Dices, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassInfo } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAcademic } from '@/context/AcademicContext';
import { Badge } from '@/components/ui/badge';

interface ClassHeaderProps {
  classInfo: ClassInfo;
  onBack: () => void;
  onEdit: (details: Partial<ClassInfo>) => void;
  onSave: () => void;
  onDialogs: {
    import: () => void;
    voice: () => void;
    rapid: () => void;
    editLearners: () => void;
    aiInsights: () => void;
    moderation: () => void;
    classroomTools: () => void;
  };
}

export const ClassHeader = ({
  classInfo,
  onBack,
  onEdit,
  onSave,
  onDialogs
}: ClassHeaderProps) => {
  const { activeTerm } = useAcademic();
  const isTermClosed = !!activeTerm?.closed;
  const isLocked = isTermClosed || classInfo.is_finalised;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card text-card-foreground p-4 md:p-6 rounded-lg border border-border shadow-sm transition-all duration-300 w-full">
      <div className="flex items-center gap-3 md:gap-4 w-full lg:w-auto overflow-hidden">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 shrink-0 border sm:border-transparent bg-background sm:bg-transparent">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90 truncate">{classInfo.className}</h1>
            {isLocked ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900 gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 shrink-0">
                    <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    Finalised
                </Badge>
            ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-40 hover:opacity-100 shrink-0 hover:bg-muted" onClick={() => onEdit({})}>
                    <Edit className="h-4 w-4" />
                </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate">
            <span className="truncate">{classInfo.grade}</span>
            <span className="h-1 w-1 bg-muted-foreground/30 rounded-full shrink-0" />
            <span className="truncate">{classInfo.subject}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center w-full lg:w-auto gap-2 pt-2 lg:pt-0 border-t lg:border-none border-border mt-2 lg:mt-0">
        {!isLocked && (
            <Button onClick={onSave} className="flex-1 sm:flex-none px-4 md:px-5 shadow-sm active:scale-95 transition-transform text-sm h-10">
                <Save className="mr-2 h-4 w-4" />
                <span>Save Changes</span>
            </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Classroom Tools</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDialogs.classroomTools} className="py-2.5">
                <Dices className="mr-2 h-4 w-4 text-purple-500" /> Class Management Tools
            </DropdownMenuItem>
            {!isLocked && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Roster & Entry</DropdownMenuLabel>
                    <DropdownMenuItem onClick={onDialogs.import} className="py-2.5">
                        <Upload className="mr-2 h-4 w-4" /> Bulk Import Names
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDialogs.editLearners} className="py-2.5">
                        <Users className="mr-2 h-4 w-4" /> Update Class Roster
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDialogs.voice} className="py-2.5 font-medium">
                        <Mic className="mr-2 h-4 w-4 text-red-500" /> Voice Entry Mode
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDialogs.rapid} className="py-2.5 font-medium">
                        <Zap className="mr-2 h-4 w-4 text-amber-500" /> Rapid Input Mode
                    </DropdownMenuItem>
                </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Advanced Analysis</DropdownMenuLabel>
            <DropdownMenuItem onClick={onDialogs.aiInsights} className="py-2.5">
                <Brain className="mr-2 h-4 w-4 text-primary" /> Generate AI Insights
            </DropdownMenuItem>
            {!isLocked && (
                <DropdownMenuItem onClick={onDialogs.moderation} className="py-2.5">
                    <Sliders className="mr-2 h-4 w-4" /> Moderation Adjustments
                </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};