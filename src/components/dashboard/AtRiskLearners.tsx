import { useClasses } from '@/context/ClassesContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { Learner } from '@/lib/types';

const AtRiskLearners = () => {
  const { classes } = useClasses();
  const { atRiskThreshold } = useSettings();

  // Flatten all learners from all classes into a single list
  // Filter for those with marks < threshold
  const atRiskList = classes.flatMap(classInfo => {
    return classInfo.learners
      .filter((l: Learner) => {
        const markNum = parseFloat(l.mark);
        return !isNaN(markNum) && markNum < atRiskThreshold;
      })
      .map((l: Learner) => ({
        ...l,
        classId: classInfo.id,
        className: classInfo.className,
        subject: classInfo.subject,
        markNum: parseFloat(l.mark)
      }));
  }).sort((a, b) => a.markNum - b.markNum) // Sort ascending (lowest first)
    .slice(0, 5); // Take top 5

  if (atRiskList.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            At Risk Learners
          </CardTitle>
          <CardDescription>Learners scoring below {atRiskThreshold}%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>Great job! No learners are currently flagged as at risk based on captured marks.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          At Risk Learners
        </CardTitle>
        <CardDescription>Learners scoring below {atRiskThreshold}%</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Mark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atRiskList.map((learner, idx) => (
              <TableRow key={`${learner.classId}-${idx}`}>
                <TableCell className="font-medium text-xs sm:text-sm truncate max-w-[100px]" title={learner.name}>
                  {learner.name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]" title={`${learner.subject} - ${learner.className}`}>
                  <Link to={`/classes/${learner.classId}`} className="hover:underline flex items-center gap-1">
                    {learner.className}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive" className="text-xs px-1.5 h-5">
                    {learner.mark}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex justify-end">
          <Link to="/classes" className="text-xs text-primary flex items-center hover:underline">
            View all classes <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default AtRiskLearners;