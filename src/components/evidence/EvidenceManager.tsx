import { Evidence, Learner } from '@/lib/types';
import { useEvidence } from '@/hooks/useEvidence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Image as ImageIcon, Trash2, ExternalLink, ShieldCheck, History, Plus, FileSearch, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { UploadEvidenceDialog } from './UploadEvidenceDialog';
import { ModerationSampleBuilder } from './ModerationSampleBuilder';
import { getSignedFileUrl } from '@/services/storage';
import { cn } from '@/lib/utils';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';
import { showError } from '@/utils/toast';

interface EvidenceManagerProps {
  classId: string;
  learnerId?: string;
  termId?: string;
  isLocked?: boolean;
  learnerName?: string;
}

export const EvidenceManager = ({ classId, learnerId, termId, isLocked, learnerName: initialLearnerName }: EvidenceManagerProps) => {
  const { evidenceList, addEvidence, deleteEvidence, isUploading } = useEvidence({ classId, learnerId, termId });
  const { classes } = useClasses();
  const { assessments, marks } = useAcademic();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  
  // Selection state for builder upload
  const [targetLearnerId, setTargetLearnerId] = useState<string | undefined>(learnerId);
  const [targetLearnerName, setTargetLearnerName] = useState<string | undefined>(initialLearnerName);

  const currentClass = classes.find(c => c.id === classId);

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'script': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'moderation': return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case 'photo': return <ImageIcon className="h-5 w-5 text-purple-500" />;
      default: return <FileSearch className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleViewFile = async (item: Evidence) => {
      setLoadingFileId(item.id);
      try {
          const url = await getSignedFileUrl(item.file_path);
          window.open(url, '_blank', 'noreferrer');
      } catch (e) {
          console.error(e);
          showError("Failed to generate secure preview link.");
      } finally {
          setLoadingFileId(null);
      }
  };

  const handleOpenUpload = (l?: Learner) => {
      if (l) {
          setTargetLearnerId(l.id);
          setTargetLearnerName(l.name);
      } else {
          setTargetLearnerId(learnerId);
          setTargetLearnerName(initialLearnerName);
      }
      setIsUploadOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {!learnerId && currentClass && (
          <ModerationSampleBuilder 
            classInfo={currentClass} 
            assessments={assessments}
            marks={marks}
            evidenceList={evidenceList}
            onUploadForLearner={handleOpenUpload}
          />
      )}

      <Card className={cn("border-dashed print:border-none print:shadow-none", isLocked && "bg-muted/10 border-muted-foreground/20 print:bg-transparent")}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("h-5 w-5 no-print", isLocked ? "text-muted-foreground" : "text-primary")} />
                <CardTitle className="text-lg print:text-black">Evidence Folder</CardTitle>
                {isLocked && <Badge variant="secondary" className="gap-1 h-5 no-print"><Lock className="h-3 w-3" /> Locked</Badge>}
              </div>
              <CardDescription className="print:text-slate-600 print:font-medium">
                {isLocked 
                    ? "Digital moderation and evidence repository (Finalized)." 
                    : `Digital moderation and evidence repository${targetLearnerName ? ' for ' + targetLearnerName : ''}.`}
              </CardDescription>
            </div>
            {!isLocked && (
              <Button size="sm" onClick={() => handleOpenUpload()} className="no-print">
                <Plus className="mr-2 h-4 w-4" /> Attach
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLocked && evidenceList.length === 0 && (
             <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100 mb-4 print:border-none print:bg-transparent print:p-0">
                <AlertCircle className="h-4 w-4 shrink-0 no-print" />
                <span className="print:text-slate-600 print:italic">No supplementary evidence documents attached to this section (Optional).</span>
             </div>
          )}

          <ScrollArea className="h-[300px] print:h-auto print:max-h-none print:overflow-visible">
            {evidenceList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2 print:py-2 print:text-left">
                <History className="h-10 w-10 mx-auto opacity-20 no-print" />
                <p className="text-sm print:text-slate-600 print:italic no-print">No evidence attached yet.</p>
                <p className="hidden print:block text-sm italic text-slate-600 mt-2">No supplementary evidence documents attached to this section (Optional).</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2 print:pr-0">
                {evidenceList.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all group print:border-slate-300 print:bg-transparent print-avoid-break">
                    <div className="bg-muted p-2 rounded-md print:border print:border-slate-200">
                      {getIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate print:text-black">{item.file_name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4 print:border-slate-400 print:text-black">
                          {item.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1 print:text-slate-600">
                        <span>{item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}</span>
                        {item.notes && <span className="truncate italic print:text-black">• {item.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewFile(item)} disabled={loadingFileId === item.id}>
                         {loadingFileId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      </Button>
                      {!isLocked && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEvidence(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <UploadEvidenceDialog 
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={addEvidence}
        isUploading={isUploading}
        learnerName={targetLearnerName}
        learnerId={targetLearnerId}
      />
    </div>
  );
};