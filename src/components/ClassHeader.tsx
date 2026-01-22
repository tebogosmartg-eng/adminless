import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Download, Save, Mic, Upload, Users, MoreHorizontal, BrainCircuit, MessageSquare, Plus } from 'lucide-react';

interface ClassHeaderProps {
  classNameStr: string;
  subject: string;
  grade: string;
  hasUnsavedChanges: boolean;
  showComments: boolean;
  onToggleComments: () => void;
  onSave: () => void;
  onOpenAiInsights: () => void;
  onOpenVoiceEntry: () => void;
  onOpenAddLearner: () => void;
  onOpenEditLearners: () => void;
  onOpenImport: () => void;
  onExport: () => void;
}

export const ClassHeader = ({
  classNameStr,
  subject,
  grade,
  hasUnsavedChanges,
  showComments,
  onToggleComments,
  onSave,
  onOpenAiInsights,
  onOpenVoiceEntry,
  onOpenAddLearner,
  onOpenEditLearners,
  onOpenImport,
  onExport
}: ClassHeaderProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <Link to="/classes" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Link>
        <h1 className="text-3xl font-bold">{subject} - {classNameStr}</h1>
        <p className="text-muted-foreground">{grade}</p>
      </div>
      <div className="flex flex-wrap gap-2">
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
        <Button onClick={onSave} disabled={!hasUnsavedChanges}>
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
              <span>Add Single Learner</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenEditLearners}>
              <Users className="mr-2 h-4 w-4" />
              <span>Bulk Manage</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenImport}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Import</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              <span>Export CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};