import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity as ActivityIcon, CheckCircle2, FileText, UserPlus, Clock, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAcademic } from "@/context/AcademicContext";

export default function RecentActivity() {
  const { activeTerm } = useAcademic();

  const activities = useLiveQuery(
    async () => {
      if (!activeTerm) return [];
      return db.activities
        .where('term_id')
        .equals(activeTerm.id)
        .reverse()
        .limit(20)
        .toArray();
    },
    [activeTerm?.id]
  );

  const getActivityIcon = (message: string) => {
    if (message.includes("AUDIT")) return <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />;
    if (message.includes("Created class")) return <UserPlus className="h-3.5 w-3.5 text-blue-500" />;
    if (message.includes("mark")) return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    if (message.includes("assessment")) return <FileText className="h-3.5 w-3.5 text-purple-500" />;
    return <ActivityIcon className="h-3.5 w-3.5 text-gray-500" />;
  };

  return (
    <Card className="h-full flex flex-col no-print">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>
        <CardDescription className="text-xs">Updates for {activeTerm?.name || 'term'}.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[250px] px-5 pb-3">
          {!activities || activities.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-6">
              No recent activity.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="mt-0.5 bg-muted rounded-full p-1.5 h-fit shrink-0">
                    {getActivityIcon(activity.message)}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[12px] font-medium leading-tight text-foreground/90 break-words">
                      {activity.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
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
}