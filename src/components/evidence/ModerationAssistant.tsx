import { useMemo } from 'react';
import { Learner } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowUpRight, ArrowDownRight, Minus, UserPlus } from 'lucide-react';

interface ModerationAssistantProps {
  learners: Learner[];
  onSelectLearner: (learner: Learner) => void;
}

export const ModerationAssistant = ({ learners, onSelectLearner }: ModerationAssistantProps) => {
  const suggestions = useMemo(() => {
    const graded = learners
        .filter(l => l.mark && !isNaN(parseFloat(l.mark)))
        .sort((a, b) => parseFloat(b.mark) - parseFloat(a.mark));

    if (graded.length < 3) return null;

    return {
        top: graded[0],
        mid: graded[Math.floor(graded.length / 2)],
        bottom: graded[graded.length - 1]
    };
  }, [learners]);

  if (!suggestions) return null;

  const SampleItem = ({ label, learner, icon: Icon, color }: { label: string, learner: Learner, icon: any, color: string }) => (
    <div className="flex items-center justify-between p-2 rounded-md bg-background border shadow-sm">
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${color}`}>
                <Icon className="h-3 w-3 text-white" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">{label}</span>
                <span className="text-xs font-semibold">{learner.name}</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] h-5">{learner.mark}%</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSelectLearner(learner)}>
                <UserPlus className="h-3.5 w-3.5" />
            </Button>
        </div>
    </div>
  );

  return (
    <Card className="bg-primary/[0.03] border-primary/20 shadow-none mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Moderation Sample Assistant</CardTitle>
        </div>
        <CardDescription className="text-[11px]">Suggested learners for your 3-point moderation sample.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
          <SampleItem label="High Performer" learner={suggestions.top} icon={ArrowUpRight} color="bg-green-600" />
          <SampleItem label="Average Performer" learner={suggestions.mid} icon={Minus} color="bg-blue-600" />
          <SampleItem label="Low Performer" learner={suggestions.bottom} icon={ArrowDownRight} color="bg-orange-600" />
      </CardContent>
    </Card>
  );
};