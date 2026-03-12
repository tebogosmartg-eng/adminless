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
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white dark:bg-card p-6 rounded-lg border shadow-sm transition-all duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground/90">{classInfo.className}</h1>
            {isLocked ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 gap-1.5 px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Finalised
                </Badge>
            ) : (
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-20 hover:opacity-100" onClick={() => onEdit({})}>
                    <Edit className="h-4 w-4" />
                </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span>{classInfo.grade}</span>
            <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
            <span>{classInfo.subject}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 pt-2 md:pt-0">
        {!isLocked && (
            <Button onClick={onSave} className="flex-1 sm:flex-none px-5 shadow-sm active:scale-95 transition-transform">
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
            </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
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