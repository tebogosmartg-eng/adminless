"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Card, CardContent, CardHeader,
  CardTitle, CardDescription
} from "@/components/ui/card";

import {
  Activity as ActivityIcon,
  CheckCircle2,
  FileText,
  UserPlus,
  Clock,
  ShieldCheck
} from "lucide-react";

import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAcademic } from "@/context/AcademicContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { showError } from "@/utils/toast";
import { logAdminLessError } from "@/utils/logAdminLessError";

export default function RecentActivity() {
  const { activeTerm } = useAcademic();

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!activeTerm?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(false);

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("term_id", activeTerm.id)
        .order("timestamp", { ascending: false })
        .limit(20);

      if (error) {
        logAdminLessError("dashboard_recent_activity_fetch", error);
        setFetchError(true);
        showError("Failed to load data");
      } else {
        setActivities(data || []);
      }

      setLoading(false);
    };

    fetchActivities();
  }, [activeTerm?.id]);

  const getActivityIcon = (message: string) => {
    if (message.includes("AUDIT"))
      return <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />;

    if (message.includes("Created class"))
      return <UserPlus className="h-3.5 w-3.5 text-blue-500" />;

    if (message.includes("mark"))
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;

    if (message.includes("assessment"))
      return <FileText className="h-3.5 w-3.5 text-purple-500" />;

    return <ActivityIcon className="h-3.5 w-3.5 text-gray-500" />;
  };

  return (
    <Card className="border-none shadow-sm bg-card text-card-foreground no-print">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Activity
        </CardTitle>

        <CardDescription className="text-xs">
          Updates for {activeTerm?.name || "term"}.
        </CardDescription>
      </CardHeader>

      <CardContent className="overflow-hidden p-0">
        <ScrollArea className="max-h-[350px] px-5 pb-3">
          {fetchError && activities.length > 0 && (
            <Alert variant="destructive" className="mb-3 mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load data</AlertTitle>
              <AlertDescription>Connection issue, please retry.</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center text-xs py-6 text-muted-foreground">
              Loading activity...
            </div>
          ) : fetchError && activities.length === 0 ? (
            <Alert variant="destructive" className="my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load data</AlertTitle>
              <AlertDescription>Connection issue, please retry.</AlertDescription>
            </Alert>
          ) : activities.length === 0 ? (
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
                    <p className="text-[12px] font-medium leading-tight break-words">
                      {activity.message}
                    </p>

                    <p className="text-[10px] text-muted-foreground font-medium uppercase">
                      {formatDistanceToNow(
                        new Date(activity.timestamp),
                        { addSuffix: true }
                      )}
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