import { useClasses } from '../context/ClassesContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Camera, BarChart3, BookOpen, GraduationCap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassSummaryCard from '@/components/ClassSummaryCard';
import GlobalStats from '@/components/GlobalStats';
import RecentActivity from '@/components/RecentActivity';
import ClassComparisonChart from '@/components/ClassComparisonChart';
import AggregatedPerformanceChart from '@/components/AggregatedPerformanceChart';
import AtRiskLearners from '@/components/AtRiskLearners';
import MarkDistributionChart from '@/components/MarkDistributionChart';
import { useMemo } from 'react';

const Dashboard = () => {
  const { classes } = useClasses();
  
  // Aggregate all learners for the global chart
  const allLearners = classes.flatMap(c => c.learners);

  // Group classes by subject
  const classesBySubject = useMemo(() => {
    const groups: Record<string, typeof classes> = {};
    classes.forEach(c => {
      if (!groups[c.subject]) groups[c.subject] = [];
      groups[c.subject].push(c);
    });
    return groups;
  }, [classes]);

  // Group classes by grade
  const classesByGrade = useMemo(() => {
    const groups: Record<string, typeof classes> = {};
    classes.forEach(c => {
      if (!groups[c.grade]) groups[c.grade] = [];
      groups[c.grade].push(c);
    });
    return groups;
  }, [classes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {classes.length > 0 && <GlobalStats classes={classes} />}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> By Subject
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> By Grade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {classes.length > 0 && (
                <>
                  <ClassComparisonChart classes={classes} />
                  <MarkDistributionChart 
                    learners={allLearners} 
                    title="Global Grade Distribution" 
                    description="Distribution of symbols across all classes and subjects." 
                  />
                </>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>All Classes</CardTitle>
                  <CardDescription>Quick access to your class registers.</CardDescription>
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
                      <p className="text-muted-foreground mt-1 mb-6">You haven't created any classes. Get started now.</p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button asChild>
                          <Link to="/classes">
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Manually
                          </Link>
                        </Button>
                        <span className="text-xs text-muted-foreground">OR</span>
                        <Button asChild variant="outline">
                          <Link to="/scan">
                            <Camera className="mr-2 h-4 w-4" /> Scan Scripts (AI)
                          </Link>
                        </Button>
                      </div>
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
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <AggregatedPerformanceChart classes={classes} groupBy="subject" />
          <div className="space-y-6">
             {Object.entries(classesBySubject).map(([subject, subjectClasses]) => (
                <div key={subject} className="space-y-4">
                   <h3 className="text-lg font-semibold">{subject}</h3>
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {subjectClasses.map(c => (
                         <ClassSummaryCard key={c.id} classInfo={c} />
                      ))}
                   </div>
                </div>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <AggregatedPerformanceChart classes={classes} groupBy="grade" />
          <div className="space-y-6">
             {Object.entries(classesByGrade).sort().map(([grade, gradeClasses]) => (
                <div key={grade} className="space-y-4">
                   <h3 className="text-lg font-semibold">{grade}</h3>
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {gradeClasses.map(c => (
                         <ClassSummaryCard key={c.id} classInfo={c} />
                      ))}
                   </div>
                </div>
             ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;