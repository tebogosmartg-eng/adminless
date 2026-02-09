import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, BookOpen, MessageCircle, Clock, ExternalLink } from "lucide-react";
import { useNotesLogic } from "@/hooks/useNotesLogic";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export const RecentAlerts = () => {
  const { recentAlerts, loadingAlerts } = useNotesLogic();
  const navigate = useNavigate();

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'behavior': return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
      case 'academic': return <BookOpen className="h-3.5 w-3.5 text-blue-500" />;
      case 'parent': return <MessageCircle className="h-3.5 w-3.5 text-purple-500" />;
      default: return <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const handleAlertClick = (classId: string | undefined, learnerId: string) => {
    if (classId) {
      navigate(`/classes/${classId}`, { state: { openLearnerId: learnerId } });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          Recent Alerts
        </CardTitle>
        <CardDescription className="text-xs">Latest behavioral and academic notes.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[250px] px-5 pb-3">
          {loadingAlerts ? (
            <div className="space-y-2 pt-1">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
            </div>
          ) : recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs">No recent alerts.</p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {recentAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex gap-2.5 items-start p-2 rounded-lg hover:bg-muted/40 transition-colors border border-transparent hover:border-border cursor-pointer group"
                  onClick={() => handleAlertClick(alert.classId, alert.learner_id)}
                >
                  <div className="mt-0.5 bg-muted p-1.5 rounded-full group-hover:bg-background transition-colors">
                    {getIcon(alert.category)}
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-[13px] group-hover:text-primary transition-colors truncate">{alert.learnerName}</span>
                        {alert.classId && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-30 group-hover:opacity-60" />}
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 shrink-0 ml-2">
                        {format(new Date(alert.date), 'dd MMM')}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight truncate">{alert.className}</p>
                    <p className="text-[12px] text-foreground/80 line-clamp-1 leading-tight italic">
                        "{alert.content}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};