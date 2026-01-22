import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { Badge } from "@/components/ui/badge";

export const GradingLegend = () => {
  const { gradingScheme } = useSettings();

  // Sort descending by min value to show A at top
  const sortedScheme = [...gradingScheme].sort((a, b) => b.min - a.min);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
          <Info className="mr-2 h-4 w-4" /> Grading Key
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Grading Scheme</h4>
            <p className="text-sm text-muted-foreground">
              Reference for symbols and levels.
            </p>
          </div>
          <div className="grid gap-2">
            {sortedScheme.map((grade) => (
              <div key={grade.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className={grade.badgeColor}>
                     {grade.symbol}
                   </Badge>
                   <span className="text-xs text-muted-foreground">Level {grade.level}</span>
                </div>
                <span className="font-mono text-xs">
                  {grade.min}% - {grade.max}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};