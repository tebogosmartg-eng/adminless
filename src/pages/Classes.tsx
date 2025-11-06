import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateClassDialog, ClassInfo } from "@/components/CreateClassDialog";
import { Users } from "lucide-react";

const Classes = () => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const handleCreateClass = (newClass: ClassInfo) => {
    setClasses((prevClasses) => [...prevClasses, newClass]);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Classes</h1>
        <CreateClassDialog onClassCreate={handleCreateClass} />
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
            <Card key={classItem.id}>
              <CardHeader>
                <CardTitle>{classItem.subject}</CardTitle>
                <CardDescription>{classItem.grade} - {classItem.className}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{classItem.learners.length} learners</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default Classes;