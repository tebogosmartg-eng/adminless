import { useClasses } from '../context/ClassesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import ClassSummaryCard from '@/components/ClassSummaryCard';
import GlobalStats from '@/components/GlobalStats';
import RecentActivity from '@/components/RecentActivity';
import ClassComparisonChart from '@/components/ClassComparisonChart';
import AtRiskLearners from '@/components/AtRiskLearners';

const Dashboard = () => {
  const { classes } = useClasses();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {classes.length > 0 && <GlobalStats classes={classes} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {classes.length > 0 && (
            <ClassComparisonChart classes={classes} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Classes Overview</CardTitle>
              <CardDescription>A quick summary of performance. Click a card to view details.</CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {classes.map(classInfo => (
                    <ClassSummaryCard key={classInfo.id} classInfo={classInfo} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                  <h3 className="text-lg font-semibold">No classes yet</h3>
                  <p className="text-muted-foreground mt-1">You haven't created any classes. Get started now.</p>
                  <Button asChild className="mt-4">
                    <Link to="/classes">
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Class
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <AtRiskLearners />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;