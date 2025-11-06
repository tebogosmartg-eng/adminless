import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useClasses } from "../context/ClassesContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardStats from "@/components/DashboardStats";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { classes } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(classes[0]?.id);

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button>
            <Camera className="mr-2 h-4 w-4" /> Scan Scripts
          </Button>
        </div>
      </div>

      {classes.length > 0 ? (
        <>
          <div className="mb-6">
            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Select a class to view stats" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.subject} - {c.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass ? (
            <DashboardStats learners={selectedClass.learners} />
          ) : (
             <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Please select a class to see its statistics.</p>
                </CardContent>
              </Card>
          )}
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
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No recent activity to display.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Dashboard;