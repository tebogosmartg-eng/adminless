// Upload/evidence storage UI removed intentionally.
// AdminLess focuses on moderation sampling, not document storage.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { ModerationSampleBuilder } from '@/components/evidence/ModerationSampleBuilder';
import { useClasses } from '@/context/ClassesContext';
import { useAcademic } from '@/context/AcademicContext';

interface ModerationManagerProps {
  classId: string;
  learnerId?: string;
  termId?: string;
  isLocked?: boolean;
  learnerName?: string;
}

export const ModerationManager = ({ classId, learnerId, termId: _termId, isLocked, learnerName }: ModerationManagerProps) => {
  const { classes } = useClasses();
  const { assessments, marks } = useAcademic();
  const currentClass = classes.find(c => c.id === classId);

  if (learnerId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Moderation</CardTitle>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              Moderation samples are created on the class <strong>Moderation</strong> tab. Use a generated sample to choose learner scripts for departmental moderation; keep scripts offline—AdminLess does not store documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {learnerName ? (
              <p>
                Learner <span className="font-medium text-foreground">{learnerName}</span> may appear in the class moderation sample when selected there.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentClass) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Moderation needs a valid class record. If this class was just created, save and refresh.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        This tool helps you generate moderation samples. Keep learner scripts physically; AdminLess does not store documents. Save your sample to record who is in the audit selection for this term.
      </p>
      <ModerationSampleBuilder
        classInfo={currentClass}
        assessments={assessments}
        marks={marks}
        isLocked={!!isLocked}
      />
    </div>
  );
};
