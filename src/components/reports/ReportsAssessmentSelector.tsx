import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { ClassInfo } from '@/components/CreateClassDialog';

interface ReportsAssessmentSelectorProps {
  filteredClasses: ClassInfo[];
  selectedClassIds: string[];
  weights: { [classId: string]: string };
  onToggleClass: (id: string, checked: boolean) => void;
  onWeightChange: (id: string, val: string) => void;
  onCalculate: () => void;
}

export const ReportsAssessmentSelector = ({
  filteredClasses,
  selectedClassIds,
  weights,
  onToggleClass,
  onWeightChange,
  onCalculate
}: ReportsAssessmentSelectorProps) => {
  const totalWeight = Object.values(weights)
    .filter(w => selectedClassIds.some(id => weights[id] === w))
    .reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    
  const displayTotalWeight = selectedClassIds.reduce((acc, id) => acc + (parseFloat(weights[id]) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Select & Weight</CardTitle>
        <CardDescription>Choose assessments and assign weighting.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {filteredClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No matching classes found.</p>
          ) : (
              <div className="space-y-4">
              {filteredClasses.map(cls => (
                  <div key={cls.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-start gap-2">
                          <Checkbox 
                              id={`chk-${cls.id}`} 
                              checked={selectedClassIds.includes(cls.id)}
                              onCheckedChange={(checked) => onToggleClass(cls.id, !!checked)}
                          />
                          <div className="grid gap-0.5">
                              <label htmlFor={`chk-${cls.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {cls.className}
                              </label>
                              <span className="text-xs text-muted-foreground">{cls.subject} ({cls.learners.length} learners)</span>
                          </div>
                      </div>
                      
                      {selectedClassIds.includes(cls.id) && (
                          <div className="flex items-center gap-2 ml-6 animate-in slide-in-from-top-2">
                              <span className="text-xs font-medium w-16">Weight:</span>
                              <Input 
                                  type="number" 
                                  className="h-7 w-20 text-right" 
                                  value={weights[cls.id] || ""}
                                  onChange={(e) => onWeightChange(cls.id, e.target.value)}
                                  placeholder="%"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                          </div>
                      )}
                  </div>
              ))}
              </div>
          )}
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t space-y-4">
           <div className="flex justify-between text-sm">
              <span>Total Weight:</span>
              <span className={displayTotalWeight !== 100 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                  {displayTotalWeight}%
              </span>
           </div>
           <Button className="w-full" onClick={onCalculate} disabled={selectedClassIds.length === 0}>
              <Calculator className="mr-2 h-4 w-4" /> Calculate Final Marks
           </Button>
        </div>
      </CardContent>
    </Card>
  );
};