import { Evidence, Learner } from '@/lib/types';
import { useEvidence } from '@/hooks/useEvidence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Image as ImageIcon, Trash2, ExternalLink, ShieldCheck, History, Plus, FileSearch, Lock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { UploadEvidenceDialog } from './UploadEvidenceDialog';
import { ModerationAssistant } from './ModerationAssistant';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useClasses } from '@/context/ClassesContext';

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Selection state for moderation assistant
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

  const getPublicUrl = (path: string) => {
      const { data } = supabase.storage.from('evidence').getPublicUrl(path);
      return data.publicUrl;
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

  const handleAssistantUpload = (file: File, category: Evidence['category'], notes: string) => {
      // Create special filters for this specific upload
      return addEvidence(file, category, notes);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {!learnerId && currentClass && !isLocked && (
          <ModerationAssistant 
            learners={currentClass.learners} 
            onSelectLearner={handleOpenUpload}
          />
      )}

      <Card className={cn("border-dashed", isLocked && "bg-muted/10 border-muted-foreground/20")}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className={cn("h-5 w-5", isLocked ? "text-muted-foreground" : "text-primary")} />
                <CardTitle className="text-lg">Evidence Folder</CardTitle>
                {isLocked && <Badge variant="secondary" className="gap-1 h-5"><Lock className="h-3 w-3" /> Locked</Badge>}
              </div>
              <CardDescription>
                {isLocked 
                    ? "Audit trail is finalized and cannot be modified." 
                    : `Attach scripts or moderation proof${targetLearnerName ? ' for ' + targetLearnerName : ''}.`}
              </CardDescription>
            </div>
            {!isLocked && (
              <Button size="sm" onClick={() => handleOpenUpload()}>
                <Plus className="mr-2 h-4 w-4" /> Attach
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLocked && evidenceList.length === 0 && (
             <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>No evidence was attached before finalization.</span>
             </div>
          )}

          <ScrollArea className="h-[300px]">
            {evidenceList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <History className="h-10 w-10 mx-auto opacity-20" />
                <p className="text-sm">No evidence attached yet.</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {evidenceList.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all group">
                    <div className="bg-muted p-2 rounded-md">
                      {getIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{item.file_name}</p>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4">
                          {item.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                        <span>{item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : ''}</span>
                        {item.notes && <span className="truncate italic">• {item.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                         <a href={getPublicUrl(item.file_path)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                         </a>
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
        onUpload={handleAssistantUpload}
        isUploading={isUploading}
        learnerName={targetLearnerName}
      />
    </div>
  );
};