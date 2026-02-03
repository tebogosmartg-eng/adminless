import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity as ActivityIcon, CheckCircle2, FileText, UserPlus, Clock } from "lucide-react";
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
    if (message.includes("Created class")) return <UserPlus className="h-4 w-4 text-blue-500" />;
    if (message.includes("mark")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (message.includes("assessment")) return <FileText className="h-4 w-4 text-purple-500" />;
    return <ActivityIcon className="h-4 w-4 text-gray-500" />;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
        <CardDescription>Updates for {activeTerm?.name || 'current term'}.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] px-6 pb-4">
          {!activities || activities.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No recent activity recorded for this term.
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="mt-0.5 bg-muted rounded-full p-1.5 h-fit">
                    {getActivityIcon(activity.message)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
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