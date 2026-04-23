import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, RotateCcw, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { GradeSymbol } from "@/lib/types";
import { showSuccess, showError } from "@/utils/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const GradingSystemSettings = () => {
  const { gradingScheme, updateGradingScheme, resetGradingScheme } = useSettings();
  const [localScheme, setLocalScheme] = useState<GradeSymbol[]>(gradingScheme);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleSchemeChange = (index: number, field: keyof GradeSymbol, value: any) => {
    const updated = [...localScheme];
    updated[index] = { ...updated[index], [field]: value };
    setLocalScheme(updated);
  };

  const handleSaveScheme = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    const isValid = localScheme.every(g => 
      !isNaN(g.min) && !isNaN(g.max) && g.symbol && !isNaN(g.level)
    );

    if (!isValid) {
      showError("Please ensure all fields are filled correctly.");
      setErrorMessage("Please ensure all grade fields are filled correctly before saving.");
      return;
    }

    updateGradingScheme(localScheme);
    showSuccess("Grading scheme updated successfully.");
    setStatusMessage("Saved ✓ Grading scheme updated.");
  };

  const handleResetScheme = () => {
    setResetDialogOpen(false);
    resetGradingScheme();
    showSuccess("Default grading scheme restored.");
    setStatusMessage("Saved ✓ Default scheme restored.");
    // Sync local state as well
    window.location.reload();
  };
  
  const handleDeleteRow = (index: number) => {
    const updated = localScheme.filter((_, i) => i !== index);
    setLocalScheme(updated);
    setDeleteIndex(null);
    setStatusMessage("Saved ✓ Grade range removed locally. Click Save to persist.");
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
    setStatusMessage("New grade range added. Click Save to persist.");
  };

  return (
    <Card className="h-full min-w-0">
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
        <CardContent className="space-y-4 min-w-0">
          {statusMessage && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
             <div className="rounded-md border max-h-[300px] overflow-x-auto w-full no-scrollbar min-w-0">
                <Table className="min-w-[400px] w-full">
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
                            className="h-8 w-full sm:w-16" 
                            value={grade.min} 
                            onChange={(e) => handleSchemeChange(index, 'min', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            type="number" 
                            className="h-8 w-full sm:w-16" 
                            value={grade.max} 
                            onChange={(e) => handleSchemeChange(index, 'max', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            className="h-8 w-full sm:w-16" 
                            value={grade.symbol} 
                            onChange={(e) => handleSchemeChange(index, 'symbol', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                           <Input 
                            type="number" 
                            className="h-8 w-full sm:w-12" 
                            value={grade.level} 
                            onChange={(e) => handleSchemeChange(index, 'level', parseFloat(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteIndex(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Button variant="outline" size="sm" onClick={handleAddRow} className="flex-1 h-10 sm:h-9">
                  <Plus className="mr-2 h-4 w-4" /> Add Range
                </Button>
                <Button variant="outline" size="sm" onClick={() => setResetDialogOpen(true)} className="w-full sm:w-auto h-10 sm:h-9">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button size="sm" onClick={handleSaveScheme} className="w-full sm:w-auto h-10 sm:h-9 font-bold">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
             </div>
          </div>
        </CardContent>
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset grading scheme?</AlertDialogTitle>
              <AlertDialogDescription>
                This replaces your current ranges with the default grading scheme.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetScheme}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove grade range?</AlertDialogTitle>
              <AlertDialogDescription>
                This row will be removed from the local list. Click Save to persist the change.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteIndex !== null && handleDeleteRow(deleteIndex)}>Remove</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
};