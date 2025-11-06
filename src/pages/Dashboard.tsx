import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Users, Percent } from "lucide-react";
import { useClasses } from "../context/ClassesContext";
import GlobalStats from "@/components/GlobalStats";
import { Link } from "react-router-dom";
import RecentActivity from "@/components/RecentActivity";

const Dashboard = () => {
  const { classes } = useClasses();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/scan">
              <Camera className="mr-2 h-4 w-4" /> Scan Scripts
            </Link>
          </Button>
        </div>
      </div>

      {classes.length > 0 ? (
        <>
          <GlobalStats classes={classes} />
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Class Overview</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((classItem) => {
                const markedLearners = classItem.learners.filter(l => l.mark && !isNaN(parseFloat(l.mark)));
                const marks = markedLearners.map(l => parseFloat(l.mark));
                let average = "N/A";
                if (marks.length > 0) {
                  const sum = marks.reduce((acc, mark) => acc + mark, 0);
                  average = (sum / marks.length).toFixed(1) + '%';
                }

                return (
                  <Card key={classItem.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{classItem.subject}</CardTitle>
                      <CardDescription>{classItem.grade} - {classItem.className}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4" /> Learners</span>
                          <span className="font-semibold">{classItem.learners.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center"><Percent className="mr-2 h-4 w-4" /> Class Average</span>
                          <span className="font-semibold">{average}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link to={`/classes/${classItem.id}`}>View Class</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold">Welcome to SmaReg!</h3>
            <p className="text-muted-foreground mt-2 mb-4">Create a class to start tracking marks and viewing statistics.</p>
            <Button asChild>
              <Link to="/classes">Create Your First Class</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="mt-8">
        <RecentActivity />
      </div>
    </>
  );
};

export default Dashboard;