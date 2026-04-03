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
      case 'script': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'moderation': return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'photo': return <ImageIcon className="h-4 w-4 text-purple-500" />;
      default: return <FileSearch className="h-4 w-4 text-gray-500" />;
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

  if (isLocked) {
    return (
      <div className="space-y-4">
        {evidenceList.length === 0 ? (
          <div className="text-sm text-slate-600 italic font-medium">
             Supplementary evidence documentation is optional and may be managed externally. Physical evidence and learner scripts are archived in the educator's classroom files or submitted directly to the moderation committee.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {evidenceList.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 py-1 rounded-lg border-none bg-transparent group/file">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-slate-300 mr-1">•</span>
                  <span className="text-[11px] font-medium truncate pr-2 text-slate-800 print:text-black">
                    {item.file_name}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-tight">({item.category})</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 no-print">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleViewFile(item)} disabled={loadingFileId === item.id}>
                     {loadingFileId === item.id ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" /> : <ExternalLink className="h-3 w-3 text-slate-400" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

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

      <Card className="border-dashed">
        <CardHeader className="pb-3 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                  Evidence Folder
              </CardTitle>
            </div>
            <CardDescription>
              {`Digital moderation and evidence repository${targetLearnerName ? ' for ' + targetLearnerName : ''}.`}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => handleOpenUpload()} className="w-full sm:w-auto h-10">
            <Plus className="mr-2 h-4 w-4" /> Attach
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {evidenceList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <History className="h-10 w-10 mx-auto opacity-20" />
                <p className="text-sm">Supplementary evidence documentation is optional and may be managed externally.</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {evidenceList.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all group">
                    <div className="bg-muted p-2 rounded-md">
                      {getIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                        <p className="font-medium text-sm truncate">{item.file_name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4 w-fit">
                          {item.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                        <span>{item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}</span>
                        {item.notes && <span className="truncate italic">• {item.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewFile(item)} disabled={loadingFileId === item.id}>
                         {loadingFileId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEvidence(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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