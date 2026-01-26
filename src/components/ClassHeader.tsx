import { ArrowLeft, Save, MoreVertical, FileDown, Mic, Zap, Users, Brain, Sliders, Upload, Share2, FileText, Download, Edit, Dices } from 'lucide-react';
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
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{classInfo.className}</h1>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit({})}>
               <Edit className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {classInfo.grade} • {classInfo.subject}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport.pdf}>
                <FileText className="mr-2 h-4 w-4" /> Class Report (PDF)
            </DropdownMenuItem>
             <DropdownMenuItem onClick={onExport.bulkPdf}>
                <Download className="mr-2 h-4 w-4" /> Bulk Learner Reports
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport.csv}>
                <FileText className="mr-2 h-4 w-4" /> CSV Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport.blankList}>
                <FileText className="mr-2 h-4 w-4" /> Blank List
            </DropdownMenuItem>
             <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport.share}>
                <Share2 className="mr-2 h-4 w-4" /> Share Summary
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tools</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDialogs.classroomTools}>
                <Dices className="mr-2 h-4 w-4" /> Classroom Tools
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDialogs.import}>
                <Upload className="mr-2 h-4 w-4" /> Import Learners
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDialogs.editLearners}>
                <Users className="mr-2 h-4 w-4" /> Edit Class List
            </DropdownMenuItem>
             <DropdownMenuSeparator />
            <DropdownMenuLabel>Input Methods</DropdownMenuLabel>
            <DropdownMenuItem onClick={onDialogs.voice}>
                <Mic className="mr-2 h-4 w-4" /> Voice Entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDialogs.rapid}>
                <Zap className="mr-2 h-4 w-4" /> Rapid Entry
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Analysis</DropdownMenuLabel>
            <DropdownMenuItem onClick={onDialogs.aiInsights}>
                <Brain className="mr-2 h-4 w-4" /> AI Insights
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDialogs.moderation}>
                <Sliders className="mr-2 h-4 w-4" /> Moderation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};