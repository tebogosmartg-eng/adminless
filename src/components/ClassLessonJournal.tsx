import { useClassLessonLogs } from '@/hooks/useClassLessonLogs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Calendar, ClipboardList, History, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

interface ClassLessonJournalProps {
  classId: string;
}

export const ClassLessonJournal = ({ classId }: ClassLessonJournalProps) => {
  const { logs, loading } = useClassLessonLogs(classId);
  const [search, setSearch] = useState("");

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    return logs.filter(l => 
        l.content.toLowerCase().includes(search.toLowerCase()) || 
        l.homework?.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  if (logs.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5 mt-6">
        <History className="h-10 w-10 mb-2 opacity-20" />
        <h3 className="font-semibold text-foreground">No Lesson Logs Yet</h3>
        <p className="text-xs max-w-xs mt-1">
          Start recording "Work Covered" from your Dashboard timetable to build a journal for this class.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="space-y-1">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Lesson Journal
            </h3>
            <p className="text-xs text-muted-foreground">Chronological record of curriculum coverage and homework.</p>
        </div>
        <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search topics or tasks..." 
                className="pl-9 h-9 text-xs" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {filteredLogs.map((log) => (
            <div key={log.id} className="relative flex items-start gap-6 group">
              {/* Timeline Marker */}
              <div className="absolute left-0 mt-1.5 h-10 w-10 rounded-full border-4 border-background bg-muted flex items-center justify-center z-10 group-hover:bg-primary group-hover:border-primary/20 transition-all duration-300">
                <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-white" />
              </div>

              <div className="flex-1 ml-10 space-y-3">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-tighter text-muted-foreground">
                        {format(new Date(log.date), 'EEEE, d MMMM')}
                    </span>
                    {log.homework && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] uppercase h-4">Homework Set</Badge>}
                </div>

                <Card className="shadow-none border bg-card hover:border-primary/30 transition-all">
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
                            <FileText className="h-3 w-3" /> Work Covered
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {log.content}
                        </p>
                    </div>

                    {log.homework && (
                        <div className="pt-3 border-t border-dashed">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600">
                                <ClipboardList className="h-3 w-3" /> Homework Task
                            </div>
                            <p className="text-xs mt-1 text-muted-foreground italic bg-amber-50/50 p-2 rounded-md border border-amber-100/50">
                                "{log.homework}"
                            </p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && search && (
              <div className="py-20 text-center text-muted-foreground italic text-sm">
                  No records matching "{search}"
              </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};