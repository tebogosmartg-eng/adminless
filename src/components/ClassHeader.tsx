import { ArrowLeft, Save, MoreVertical, FileDown, Mic, Zap, Users, Brain, Sliders, Upload, Share2, FileText, Download, Edit, Dices, Lock } from 'lucide-react';
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

interface ClassHeaderProps {
  classInfo: ClassInfo;
  onBack: () => void;
  onEdit: (details: Partial<ClassInfo>) => void;
  onSave: () => void;
  onExport: {
    csv: () => void;
    pdf: () => void;
    bulkPdf: () => void;
    blankList: () => void;
    share: () => void;
    sasams: () => void;
  };
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
  onExport,
  onDialogs
}: ClassHeaderProps) => {
  const { activeTerm } = useAcademic();
  const isTermClosed = !!activeTerm?.closed;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white dark:bg-card p-6 rounded-lg border shadow-sm transition-all duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground/90">{classInfo.className}</h1>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-20 hover:opacity-100" onClick={() => onEdit({})}>
               <Edit className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span>{classInfo.grade}</span>
            <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
            <span>{classInfo.subject}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 pt-2 md:pt-0">
        <Button onClick={onSave} className="flex-1 sm:flex-none px-5 shadow-sm active:scale-95 transition-transform">
            <Save className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex-1 sm:flex-none gap-2">
              <FileDown className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Reports & Data</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport.pdf} className="py-2.5">
                <FileText className="mr-2 h-4 w-4 text-blue-500" /> Class Marksheet (PDF)
            </DropdownMenuItem>
             <DropdownMenuItem onClick={onExport.bulkPdf} className="py-2.5">
                <Download className="mr-2 h-4 w-4 text-green-500" /> Learner Report Cards (PDF)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport.csv} className="py-2.5">
                <FileText className="mr-2 h-4 w-4 text-slate-500" /> Export Data (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport.sasams} disabled={!isTermClosed} className="py-2.5">
                <Download className="mr-2 h-4 w-4 text-primary" /> SA-SAMS Export (CSV)
                {!isTermClosed && <Lock className="ml-auto h-3 w-3 opacity-30" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport.blankList} className="py-2.5">
                <FileText className="mr-2 h-4 w-4 text-orange-500" /> Blank List (PDF)
            </DropdownMenuItem>
             <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport.share} className="py-2.5">
                <Share2 className="mr-2 h-4 w-4 text-indigo-500" /> Share Summary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Advanced Analysis</DropdownMenuLabel>
            <DropdownMenuItem onClick={onDialogs.aiInsights} className="py-2.5">
                <Brain className="mr-2 h-4 w-4 text-primary" /> Generate AI Insights
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDialogs.moderation} className="py-2.5">
                <Sliders className="mr-2 h-4 w-4" /> Moderation Adjustments
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};