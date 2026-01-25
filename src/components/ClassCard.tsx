import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Copy, Archive, ArchiveRestore } from "lucide-react";
import { ClassInfo } from "@/components/CreateClassDialog";

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
  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
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
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4" />
          <span>{classItem.learners.length} learners</span>
        </div>
        {classItem.notes && (
           <p className="mt-2 text-xs text-muted-foreground truncate italic">
             "{classItem.notes}"
           </p>
        )}
      </CardContent>
    </Card>
  );
};