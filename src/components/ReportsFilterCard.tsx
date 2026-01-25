import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReportsFilterCardProps {
  selectedGrade: string;
  setSelectedGrade: (val: string) => void;
  uniqueGrades: string[];
  selectedSubject: string;
  setSelectedSubject: (val: string) => void;
  uniqueSubjects: string[];
}

export const ReportsFilterCard = ({
  selectedGrade,
  setSelectedGrade,
  uniqueGrades,
  selectedSubject,
  setSelectedSubject,
  uniqueSubjects
}: ReportsFilterCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Filter Assessments</CardTitle>
        <CardDescription>Narrow down the class list.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Grade</label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger>
              <SelectValue placeholder="Select Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject</label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};