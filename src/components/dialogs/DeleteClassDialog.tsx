import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ClassInfo } from "@/lib/types";
import { useClasses } from "@/context/ClassesContext";
import { showSuccess } from "@/utils/toast";

interface DeleteClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classInfo: ClassInfo | null;
}

export const DeleteClassDialog = ({ open, onOpenChange, classInfo }: DeleteClassDialogProps) => {
  const { deleteClass } = useClasses();

  const handleDelete = () => {
    if (classInfo) {
      deleteClass(classInfo.id);
      showSuccess(`Class "${classInfo.className}" has been deleted.`);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            <span className="font-semibold"> {classInfo?.subject} - {classInfo?.className} </span>
            class and all of its learner data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};