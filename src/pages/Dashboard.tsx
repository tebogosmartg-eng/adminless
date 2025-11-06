import { useState } from 'react';
import { useClasses } from '../context/ClassesContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClassStats from '@/components/ClassStats';
import MarkDistributionChart from '@/components/MarkDistributionChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import ClassSummaryCard from '@/components/ClassSummaryCard';

const Dashboard = () => {
  const { classes } = useClasses();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes.length > 0 ? classes[0].id : null);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>All Classes Overview</CardTitle>
          <CardDescription>A quick summary of performance across all your classes. Click a card to view details.</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map(classInfo => (
                <ClassSummaryCard key={classInfo.id} classInfo={classInfo} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <h3 className="text-lg font-semibold">No classes yet</h3>
              <p className="text-muted-foreground mt-1">You haven't created any classes. Get started by creating one.</p>
              <Button asChild className="mt-4">
                <Link to="/classes">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Class
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Class Analysis</CardTitle>
          <CardDescription>Select a class from the dropdown to see a detailed breakdown of its performance.</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length > 0 && selectedClass ? (
            <>
              <div className="mb-6 max-w-sm">
                <Select onValueChange={setSelectedClassId} defaultValue={selectedClassId ?? undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
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
              <ClassStats learners={selectedClass.learners} />
              <MarkDistributionChart learners={selectedClass.learners} />
            </>
          ) : (
             <div className="text-center py-10">
              <p className="text-muted-foreground">Create a class to see detailed statistics here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;