import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { BarChart2, MoreHorizontal, Trash2, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Assessment, Learner } from '@/lib/types';

interface MarkSheetTableProps {
  assessments: Assessment[]; // All assessments to check for empty state
  visibleAssessments: Assessment[];
  filteredLearners: Learner[];
  currentViewTermName: string | undefined;
  isLocked: boolean | undefined;
  isUsingVisibleTotal: boolean;
  setIsAddOpen: (open: boolean) => void;
  openAnalytics: (ass: Assessment) => void;
  deleteAssessment: (id: string) => void;
  getMarkValue: (assId: string, lId: string) => string;
  handleMarkChange: (assId: string, lId: string, val: string) => void;
  calculateLearnerTotal: (lId: string) => string;
  getAssessmentStats: (assId: string) => { avg: string; max: string | number; min: string | number };
}

export const MarkSheetTable = ({
  assessments, visibleAssessments, filteredLearners, currentViewTermName,
  isLocked, isUsingVisibleTotal, setIsAddOpen,
  openAnalytics, deleteAssessment, getMarkValue, handleMarkChange,
  calculateLearnerTotal, getAssessmentStats
}: MarkSheetTableProps) => {

  if (assessments.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-muted/10 border rounded-md">
        No assessments found for {currentViewTermName}.
        {!isLocked && (
          <div className="mt-4">
            <Button variant="outline" onClick={() => setIsAddOpen(true)}>Create Assessment</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px] sticky left-0 bg-background z-10 shadow-sm">
              <div className="flex items-center gap-2">
                Learner
                <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
                  {filteredLearners.length}
                </Badge>
              </div>
            </TableHead>
            {visibleAssessments.map(ass => (
              <TableHead key={ass.id} className="text-center min-w-[140px]">
                <div className="flex flex-col items-center group relative">
                  <div className="flex items-center gap-1 cursor-pointer hover:bg-muted/50 p-1 rounded" onClick={() => openAnalytics(ass)}>
                    <span className="font-semibold truncate max-w-[100px]" title={ass.title}>{ass.title}</span>
                    <BarChart2 className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100" />
                  </div>
                  <span className="text-xs text-muted-foreground font-normal">
                    {ass.max_mark} marks • {ass.weight}%
                  </span>
                  {!isLocked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 mt-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 top-0"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => { deleteAssessment(ass.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TableHead>
            ))}
            <TableHead className="text-center font-bold bg-muted/30 min-w-[100px]">
              {isUsingVisibleTotal && <span className="text-[10px] font-normal block text-muted-foreground">(Visible)</span>}
              Total <br /> %
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLearners.map(learner => (
            <TableRow key={learner.id || learner.name}>
              <TableCell className="font-medium sticky left-0 bg-background z-10 border-r shadow-sm">
                {learner.name}
              </TableCell>
              {visibleAssessments.map(ass => (
                <TableCell key={ass.id} className="p-1">
                  <div className="flex justify-center">
                    <Input
                      className={`h-8 w-16 text-center ${isLocked ? "bg-muted cursor-not-allowed" : ""}`}
                      value={getMarkValue(ass.id, learner.id || '')}
                      onChange={(e) => learner.id && handleMarkChange(ass.id, learner.id, e.target.value)}
                      disabled={!learner.id || !!isLocked}
                      placeholder="-"
                    />
                  </div>
                </TableCell>
              ))}
              <TableCell className="text-center font-bold bg-muted/30">
                {learner.id ? calculateLearnerTotal(learner.id) : '-'}
              </TableCell>
            </TableRow>
          ))}

          <TableRow className="bg-muted/50 border-t-2 border-muted">
            <TableCell className="font-bold sticky left-0 bg-muted/95 z-10 border-r text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Class Stats
              </div>
            </TableCell>
            {visibleAssessments.map(ass => {
              const stats = getAssessmentStats(ass.id);
              return (
                <TableCell key={ass.id} className="text-center p-2">
                  <div className="flex flex-col text-xs space-y-1 cursor-pointer hover:bg-muted/80 rounded" onClick={() => openAnalytics(ass)}>
                    <div className="font-semibold text-foreground">Avg: {stats.avg}</div>
                    <div className="flex justify-center gap-2 text-muted-foreground text-[10px]">
                      <span className="flex items-center text-green-600" title="Highest">
                        <ArrowUp className="h-2 w-2 mr-0.5" />{stats.max}
                      </span>
                      <span className="flex items-center text-red-600" title="Lowest">
                        <ArrowDown className="h-2 w-2 mr-0.5" />{stats.min}
                      </span>
                    </div>
                  </div>
                </TableCell>
              );
            })}
            <TableCell className="bg-muted/30"></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};