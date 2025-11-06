import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { Users } from "lucide-react";
import { useClasses } from "../context/ClassesContext";

const Classes = () => {
  const { classes, addClass } = useClasses();

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
            <Link to={`/classes/${classItem.id}`} key={classItem.id} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">
              <Card className="h-full transition-all hover:border-primary">
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
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default Classes;