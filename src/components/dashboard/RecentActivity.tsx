import { useActivity } from '@/context/ActivityContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RecentActivity = () => {
  const { activities } = useActivity();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p>No recent activity to display.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <li key={activity.id} className="flex items-start gap-4">
                <div className="bg-muted rounded-full p-2">
                  <List className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;