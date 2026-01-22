import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Download, Save, Mic, Upload, Users, MoreHorizontal, BrainCircuit, MessageSquare, Plus, FileText, Eraser, File, CheckCircle2, Share2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GradingLegend } from './GradingLegend';

interface ClassHeaderProps {
  classNameStr: string;
  subject: string;
  grade: string;
  learnerCount: number;
  gradedCount: number;
  hasUnsavedChanges: boolean;
  showComments: boolean;
  onToggleComments: () => void;
  onSave: () => void;
  onOpenAiInsights: () => void;
  onOpenVoiceEntry: () => void;
  onOpenAddLearner: () => void;
  onOpenEditLearners: () => void;
  onOpenImport: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportBlankPdf: () => void;
  onClearMarks: () => void;
  onShare: () => void;
}

export const ClassHeader = ({
  classNameStr,
  subject,
  grade,
  learnerCount,
  gradedCount,
  hasUnsavedChanges,
  showComments,
  onToggleComments,
  onSave,
  onOpenAiInsights,
  onOpenVoiceEntry,
  onOpenAddLearner,
  onOpenEditLearners,
  onOpenImport,
  onExportCsv,
  onExportPdf,
  onExportBlankPdf,
  onClearMarks,
  onShare
}: ClassHeaderProps) => {
  const completionPercentage = learnerCount > 0 ? Math.round((gradedCount / learnerCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 mb-6">
      {/* Top Row: Back link and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/classes" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Link>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold">{subject}</h1>
            <Badge variant="outline" className="text-base font-normal">{classNameStr}</Badge>
            <span className="text-muted-foreground">{grade}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShare} title="Share Summary">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button 
            variant="outline" 
            className="border-primary/20 text-primary hover:bg-primary/5"
            onClick={onOpenAiInsights}
          >
            <BrainCircuit className="mr-2 h-4 w-4" /> Insights
          </Button>
          <Button 
            variant="outline" 
            className={showComments ? "bg-muted" : ""}
            onClick={onToggleComments}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> {showComments ? 'Hide Comments' : 'Comments'}
          </Button>
          <Button onClick={onSave} disabled={!hasUnsavedChanges} className={hasUnsavedChanges ? "animate-pulse" : ""}>
            <Save className="mr-2 h-4 w-4" />
            {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
          </Button>
          <Button variant="outline" onClick={onOpenVoiceEntry}>
            <Mic className="mr-2 h-4 w-4" /> Voice
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenAddLearner}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Add Learners</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenEditLearners}>
                <Users className="mr-2 h-4 w-4" />
                <span>Bulk Manage List</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenImport}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Import CSV</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearMarks} className="text-orange-600 focus:text-orange-700">
                <Eraser className="mr-2 h-4 w-4" />
                <span>Clear All Marks</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportPdf}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Export PDF Report</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportBlankPdf}>
                <File className="mr-2 h-4 w-4" />
                <span>Export Blank Sheet</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress Bar Row */}
      <div className="flex items-center gap-4 bg-muted/20 p-3 rounded-lg border">
        <div className="flex items-center gap-2 min-w-[140px]">
           <CheckCircle2 className={`h-5 w-5 ${completionPercentage === 100 ? 'text-green-500' : 'text-muted-foreground'}`} />
           <span className="text-sm font-medium">Grading Progress</span>
        </div>
        <div className="flex-1">
          <Progress value={completionPercentage} className="h-2" />
        </div>
        <div className="flex items-center gap-4">
           <div className="min-w-[80px] text-right text-sm text-muted-foreground">
             {gradedCount} / {learnerCount} ({completionPercentage}%)
           </div>
           <GradingLegend />
        </div>
      </div>
    </div>
  );
};