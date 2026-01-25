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
import { TrendingUp, History, Calendar } from "lucide-react";

interface HistoryItem {
  id: string;
  subject: string;
  grade: string;
  className: string;
  mark: number;
  comment?: string;
  date: string;
}

interface ProfileHistoryTabProps {
  history: HistoryItem[];
  stats: { avg: number; max: number; count: number } | null;
  subjects: string[];
  getSubjectColor: (subject: string) => string;
}

export const ProfileHistoryTab = ({ history, stats, subjects, getSubjectColor }: ProfileHistoryTabProps) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 pt-10">
        <TrendingUp className="h-12 w-12 opacity-20" />
        <p>No other history found for this learner.</p>
        <p className="text-xs">Make sure the name spelling is identical across classes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 pt-4">
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
      <div className="h-[250px] w-full border rounded-lg p-2 bg-card">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
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
            <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" opacity={0.3} />
            <Line 
              type="monotone" 
              dataKey="mark" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={({ cx, cy, payload }) => {
                return (
                  <circle cx={cx} cy={cy} r={4} fill={getSubjectColor(payload.subject)} stroke="none" />
                );
              }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {subjects.map((sub) => (
            <div key={sub} className="flex items-center gap-1 text-[10px]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getSubjectColor(sub) }} />
              <span>{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
        <div className="bg-muted/50 p-2 border-b">
          <h4 className="text-xs font-semibold flex items-center gap-2">
            <History className="h-3 w-3" /> Assessment History
          </h4>
        </div>
        <ScrollArea className="flex-1 h-[200px]">
          <div className="divide-y">
            {history.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: getSubjectColor(item.subject) }} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium truncate max-w-[200px]">{item.subject}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {item.className}
                    </span>
                  </div>
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
  );
};