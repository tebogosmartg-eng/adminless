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
      case 'behavior': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'academic': return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'parent': return <MessageCircle className="h-4 w-4 text-purple-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleAlertClick = (classId: string | undefined, learnerId: string) => {
    if (classId) {
      navigate(`/classes/${classId}`, { state: { openLearnerId: learnerId } });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Recent Alerts
        </CardTitle>
        <CardDescription>Latest behavioral and academic notes.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] px-6 pb-4">
          {loadingAlerts ? (
            <div className="space-y-3 pt-2">
               <Skeleton className="h-12 w-full" />
               <Skeleton className="h-12 w-full" />
               <Skeleton className="h-12 w-full" />
            </div>
          ) : recentAlerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">No recent alerts recorded.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {recentAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex gap-3 items-start p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer group"
                  onClick={() => handleAlertClick(alert.classId, alert.learner_id)}
                >
                  <div className="mt-1 bg-muted p-1.5 rounded-full group-hover:bg-background transition-colors">
                    {getIcon(alert.category)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">{alert.learnerName}</span>
                        {alert.classId && <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(alert.date), 'dd MMM')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.className}</p>
                    <p className="text-sm text-foreground line-clamp-2 leading-tight">
                        {alert.content}
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