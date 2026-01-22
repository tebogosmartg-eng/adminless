import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CreateClassDialog, ClassInfo } from "@/components/CreateClassDialog";
import { EditClassDialog } from "@/components/EditClassDialog";
import { DeleteClassDialog } from "@/components/DeleteClassDialog";
import { Users, MoreVertical, Copy } from "lucide-react";
import { useClasses } from "../context/ClassesContext";
import { showSuccess } from "@/utils/toast";

const Classes = () => {
  const { classes, addClass } = useClasses();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);

  const handleEdit = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsEditOpen(true);
  };

  const handleDelete = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsDeleteOpen(true);
  };

  const handleDuplicate = (classItem: ClassInfo) => {
    const newClass: ClassInfo = {
      ...classItem,
      id: new Date().toISOString(),
      className: `${classItem.className} (Copy)`,
      // Create fresh learner objects with empty marks/comments
      learners: classItem.learners.map(l => ({
        name: l.name,
        mark: "",
        comment: ""
      }))
    };
    
    addClass(newClass);
    showSuccess(`Class duplicated as "${newClass.className}"`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Classes</h1>
        <CreateClassDialog onClassCreate={addClass} />
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
            <CardDescription>Manage your classes, subjects, and student lists here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No Classes Found</h3>
              <p className="text-muted-foreground mt-2">Get started by creating your first class.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-xl truncate pr-2">{classItem.subject}</CardTitle>
                  <CardDescription className="truncate">{classItem.grade} - {classItem.className}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/classes/${classItem.id}`)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(classItem)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(classItem)}>
                      Edit Info
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(classItem)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow cursor-pointer pt-0" onClick={() => navigate(`/classes/${classItem.id}`)}>
                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{classItem.learners.length} learners</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <EditClassDialog isOpen={isEditOpen} onOpenChange={setIsEditOpen} classInfo={selectedClass} />
      <DeleteClassDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} classInfo={selectedClass} />
    </>
  );
};

export default Classes;