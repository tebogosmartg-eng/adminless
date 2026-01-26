import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, RotateCcw, Save } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { GradeSymbol } from "@/utils/grading";
import { showSuccess, showError } from "@/utils/toast";

export const GradingSystemSettings = () => {
  const { gradingScheme, updateGradingScheme, resetGradingScheme } = useSettings();
  const [localScheme, setLocalScheme] = useState<GradeSymbol[]>(gradingScheme);

  const handleSchemeChange = (index: number, field: keyof GradeSymbol, value: any) => {
    const updated = [...localScheme];
    updated[index] = { ...updated[index], [field]: value };
    setLocalScheme(updated);
  };

  const handleSaveScheme = () => {
    const isValid = localScheme.every(g => 
      !isNaN(g.min) && !isNaN(g.max) && g.symbol && !isNaN(g.level)
    );

    if (!isValid) {
      showError("Please ensure all fields are filled correctly.");
      return;
    }

    updateGradingScheme(localScheme);
    showSuccess("Grading scheme updated successfully.");
  };

  const handleResetScheme = () => {
    if (confirm("Are you sure you want to reset to the default grading scheme?")) {
      resetGradingScheme();
      // Sync local state as well
      window.location.reload(); 
    }
  };
  
  const handleDeleteRow = (index: number) => {
    const updated = localScheme.filter((_, i) => i !== index);
    setLocalScheme(updated);
  };

  const handleAddRow = () => {
    const newRow: GradeSymbol = {
      id: Date.now().toString(),
      min: 0,
      max: 0,
      symbol: "New",
      level: 0,
      color: "text-gray-700",
      badgeColor: "bg-gray-100 text-gray-700",
    };
    setLocalScheme([...localScheme, newRow]);
  };

  return (
    <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grading System</CardTitle>
              <CardDescription>
                Customize the grade ranges, symbols, and levels used for analysis.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             <div className="rounded-md border max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Sym</TableHead>
                      <TableHead>Lvl</TableHead>
                      <TableHead className="w-[40px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localScheme.map((grade, index) => (
                      <TableRow key={grade.id || index}>
                        <TableCell className="p-2">
                          <Input 
                            type="number" 
                            className="h-8 w-16" 
                            value={grade.min} 
                            onChange={(e) => handleSchemeChange(index, 'min', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            type="number" 
                            className="h-8 w-16" 
                            value={grade.max} 
                            onChange={(e) => handleSchemeChange(index, 'max', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            className="h-8 w-16" 
                            value={grade.symbol} 
                            onChange={(e) => handleSchemeChange(index, 'symbol', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                           <Input 
                            type="number" 
                            className="h-8 w-12" 
                            value={grade.level} 
                            onChange={(e) => handleSchemeChange(index, 'level', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRow(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAddRow} className="flex-1">
                  <Plus className="mr-2 h-4 w-4" /> Add Range
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetScheme}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button size="sm" onClick={handleSaveScheme}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
             </div>
          </div>
        </CardContent>
    </Card>
  );
};