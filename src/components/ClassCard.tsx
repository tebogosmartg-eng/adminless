import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Copy, Archive, ArchiveRestore, ShieldCheck, FileText, AlertCircle } from "lucide-react";
import { ClassInfo } from "@/lib/types";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Badge } from "./ui/badge";

interface ClassCardProps {
  classItem: ClassInfo;
  onView: (id: string) => void;
  onEdit: (classItem: ClassInfo) => void;
  onDelete: (classItem: ClassInfo) => void;
  onDuplicate: (classItem: ClassInfo) => void;
  onToggleArchive: (classItem: ClassInfo) => void;
}

export const ClassCard = ({ 
  classItem, 
  onView, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onToggleArchive 
}: ClassCardProps) => {
  
  // Calculate moderation status for this class
  const moderationStats = useLiveQuery(async () => {
    const [sample, evidence] = await Promise.all([
        db.moderation_samples.where('class_id').equals(classItem.id).first(),
        db.evidence.where('class_id').equals(classItem.id).toArray()
    ]);

    if (!sample) return { status: 'none' };

    const scriptLearnerIds = new Set(evidence.filter(e => e.category === 'script').map(e => e.learner_id));
    const completedCount = sample.learner_ids.filter(id => scriptLearnerIds.has(id)).length;
    const isComplete = completedCount === sample.learner_ids.length;

    return { 
        status: isComplete ? 'complete' : 'partial',
        count: completedCount,
        total: sample.learner_ids.length
    };
  }, [classItem.id]);

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors group">
      <CardHeader className="flex-row items-start justify-between pb-2">
        <div className="overflow-hidden">
          <CardTitle className="text-xl truncate pr-2" title={classItem.subject}>{classItem.subject}</CardTitle>
          <CardDescription className="truncate" title={`${classItem.grade} - ${classItem.className}`}>
            {classItem.grade} - {classItem.className}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(classItem.id)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(classItem)}>
              <Copy className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(classItem)}>
              Edit Info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleArchive(classItem)}>
              {classItem.archived ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> Restore
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(classItem)} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow cursor-pointer pt-0" onClick={() => onView(classItem.id)}>
        <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                <span>{classItem.learners.length} learners</span>
            </div>

            {moderationStats?.status === 'complete' ? (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100 w-fit">
                    <ShieldCheck className="h-3 w-3" /> Audit Ready
                </div>
            ) : moderationStats?.status === 'partial' ? (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 w-fit">
                    <AlertCircle className="h-3 w-3" /> Scripts: {moderationStats.count}/{moderationStats.total}
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 w-fit">
                    <FileText className="h-3 w-3" /> Sample Pending
                </div>
            )}
        </div>
        
        {classItem.notes && (
           <p className="mt-4 text-xs text-muted-foreground truncate italic border-t pt-2">
             "{classItem.notes}"
           </p>
        )}
      </CardContent>
    </Card>
  );
};