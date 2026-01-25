import { useMemo, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Learner } from "./CreateClassDialog";
import { getGradeSymbol } from "@/utils/grading";
import { useSettings } from "@/context/SettingsContext";
import { useClasses } from "@/context/ClassesContext";
import { Badge } from "@/components/ui/badge";
import { User, Quote, Download, TrendingUp, History, Calendar, Check, X, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateLearnerReportPDF } from "@/utils/pdfGenerator";
import { showSuccess } from "@/utils/toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from "lucide-react";

interface LearnerProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  learner: Learner | null;
  classSubject: string;
}

export const LearnerProfileDialog = ({ isOpen, onOpenChange, learner, classSubject }: LearnerProfileDialogProps) => {
  const { gradingScheme, schoolName, teacherName, schoolLogo } = useSettings();
  const { classes } = useClasses();
  
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Find all history for this learner across all classes
  const learnerHistory = useMemo(() => {
    if (!learner) return [];

    const history = classes.flatMap(c => {
      // Fuzzy match or exact match on name
      const match = c.learners.find(l => l.name.toLowerCase() === learner.name.toLowerCase());
      if (match && match.mark && !isNaN(parseFloat(match.mark))) {
        return {
          classId: c.id,
          subject: c.subject,
          grade: c.grade,
          className: c.className,
          mark: parseFloat(match.mark),
          comment: match.comment,
          date: c.id // Using ID as proxy for date if it's timestamp-based, otherwise just insertion order
        };
      }
      return [];
    });

    // Sort by "date" (class ID is timestamp based in this app)
    return history.sort((a, b) => a.date.localeCompare(b.date));
  }, [learner, classes]);

  const stats = useMemo(() => {
    if (learnerHistory.length === 0) return null;
    const total = learnerHistory.reduce((sum, item) => sum + item.mark, 0);
    const avg = Math.round(total / learnerHistory.length);
    const max = Math.max(...learnerHistory.map(i => i.mark));
    const min = Math.min(...learnerHistory.map(i => i.mark));
    return { avg, max, min, count: learnerHistory.length };
  }, [learnerHistory]);

  useEffect(() => {
    if (isOpen && learner?.id) {
       const fetchAttendance = async () => {
           setLoadingAttendance(true);
           const { data } = await supabase
               .from('attendance')
               .select('status')
               .eq('learner_id', learner.id);
           
           if (data) {
               const newStats = data.reduce((acc: any, curr: any) => {
                   acc[curr.status] = (acc[curr.status] || 0) + 1;
                   acc.total++;
                   return acc;
               }, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
               setAttendanceStats(newStats);
           }
           setLoadingAttendance(false);
       };
       fetchAttendance();
    }
  }, [isOpen, learner]);

  if (!learner) return null;

  const currentSymbol = getGradeSymbol(learner.mark, gradingScheme);
  const attendanceRate = attendanceStats.total > 0 
    ? Math.round(((attendanceStats.present + attendanceStats.late) / attendanceStats.total) * 100) 
    : 0;

  const handleDownloadReport = () => {
    // NOTE: We approximate the class info structure here since we only have the combined string
    const tempClassInfo = {
      subject: classSubject,
      grade: "", 
      className: "" 
    };

    generateLearnerReportPDF(learner, tempClassInfo, gradingScheme, schoolName, teacherName, schoolLogo);
    showSuccess(`Report downloaded for ${learner.name}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-primary/10 p-2.5 rounded-full">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              {learner.name}
              <p className="text-sm font-normal text-muted-foreground">Performance Profile</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="current" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Report</TabsTrigger>
            <TabsTrigger value="history">History & Trends</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="flex-1 space-y-4 pt-4 overflow-y-auto">
             <div className="flex items-center justify-center p-8 bg-muted/30 rounded-xl border border-dashed">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {classSubject}
                  </p>
                  <span className="text-6xl font-extrabold tracking-tight text-primary">
                    {learner.mark ? `${learner.mark}%` : "N/A"}
                  </span>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    {currentSymbol ? (
                      <>
                        <Badge className={`text-lg px-4 py-1.5 ${currentSymbol.badgeColor}`} variant="outline">
                          {currentSymbol.symbol}
                        </Badge>
                        <span className="text-muted-foreground font-medium">
                          Level {currentSymbol.level}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">No Grade Assigned</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground">
                  <Quote className="h-4 w-4" /> Teacher's Comment
                </h4>
                <div className="p-4 bg-muted/50 rounded-md border text-sm italic relative">
                  <Quote className="absolute top-2 left-2 h-8 w-8 text-muted-foreground/10 rotate-180" />
                  {learner.comment ? (
                    <span className="relative z-10">"{learner.comment}"</span>
                  ) : (
                    <span className="text-muted-foreground not-italic relative z-10">No comment recorded yet.</span>
                  )}
                </div>
              </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 space-y-4 pt-4 overflow-hidden flex flex-col">
            {learnerHistory.length > 0 ? (
              <div className="flex flex-col h-full space-y-4">
                 {/* Mini Stats */}
                 <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/30 p-3 rounded-lg text-center border">
                       <span className="text-xs text-muted-foreground">Average</span>
                       <p className="text-xl font-bold">{stats?.avg}%</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg text-center border">
                       <span className="text-xs text-muted-foreground">Assessments</span>
                       <p className="text-xl font-bold">{stats?.count}</p>
                    </div>
                     <div className="bg-muted/30 p-3 rounded-lg text-center border">
                       <span className="text-xs text-muted-foreground">Highest</span>
                       <p className="text-xl font-bold text-green-600">{stats?.max}%</p>
                    </div>
                 </div>

                 {/* Trend Chart */}
                 <div className="h-[200px] w-full border rounded-lg p-2 bg-card">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={learnerHistory}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="subject" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-popover border text-popover-foreground text-xs p-2 rounded shadow-md">
                                  <p className="font-bold">{d.subject}</p>
                                  <p>{d.className}</p>
                                  <p className="text-primary font-bold">{d.mark}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" opacity={0.5} />
                        <Line 
                          type="monotone" 
                          dataKey="mark" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2} 
                          dot={{ r: 4, fill: "hsl(var(--primary))" }} 
                          activeDot={{ r: 6 }} 
                        />
                      </LineChart>
                   </ResponsiveContainer>
                 </div>

                 {/* History List */}
                 <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
                    <div className="bg-muted/50 p-2 border-b">
                      <h4 className="text-xs font-semibold flex items-center gap-2">
                        <History className="h-3 w-3" /> Assessment History
                      </h4>
                    </div>
                    <ScrollArea className="flex-1">
                       <div className="divide-y">
                         {learnerHistory.map((item, idx) => (
                           <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-sm font-medium truncate max-w-[200px]">{item.subject}</span>
                                 <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {item.className}
                                 </span>
                              </div>
                              <div className="text-right">
                                 <span className={`text-sm font-bold ${item.mark >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.mark}%
                                 </span>
                                 {item.grade && <p className="text-[10px] text-muted-foreground">{item.grade}</p>}
                              </div>
                           </div>
                         ))}
                       </div>
                    </ScrollArea>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                <TrendingUp className="h-12 w-12 opacity-20" />
                <p>No other history found for this learner.</p>
                <p className="text-xs">Make sure the name spelling is identical across classes.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="flex-1 space-y-4 pt-4 overflow-y-auto">
             {loadingAttendance ? (
                <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
             ) : attendanceStats.total === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                   <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                   <p>No attendance records found for this learner.</p>
                </div>
             ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-center p-6 bg-muted/30 rounded-xl border">
                        <div className="text-center">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Attendance Rate
                            </p>
                            <span className={
                                `text-5xl font-extrabold tracking-tight ${attendanceRate >= 90 ? 'text-green-600' : attendanceRate >= 80 ? 'text-amber-600' : 'text-red-600'}`
                            }>
                                {attendanceRate}%
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/10 flex flex-col items-center">
                            <Check className="h-6 w-6 text-green-600 mb-2" />
                            <span className="text-2xl font-bold">{attendanceStats.present}</span>
                            <span className="text-xs text-muted-foreground">Present</span>
                        </div>
                        <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/10 flex flex-col items-center">
                            <X className="h-6 w-6 text-red-600 mb-2" />
                            <span className="text-2xl font-bold">{attendanceStats.absent}</span>
                            <span className="text-xs text-muted-foreground">Absent</span>
                        </div>
                        <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/10 flex flex-col items-center">
                            <Clock className="h-6 w-6 text-orange-600 mb-2" />
                            <span className="text-2xl font-bold">{attendanceStats.late}</span>
                            <span className="text-xs text-muted-foreground">Late</span>
                        </div>
                        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/10 flex flex-col items-center">
                            <AlertCircle className="h-6 w-6 text-blue-600 mb-2" />
                            <span className="text-2xl font-bold">{attendanceStats.excused}</span>
                            <span className="text-xs text-muted-foreground">Excused</span>
                        </div>
                    </div>
                </div>
             )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" /> Download Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};