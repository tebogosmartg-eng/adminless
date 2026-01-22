import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { Eye, EyeOff, Save, ShieldCheck, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { GradeSymbol } from "@/utils/grading";

const Settings = () => {
  const { apiKey, setApiKey, gradingScheme, updateGradingScheme, resetGradingScheme } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  
  // Local state for grading scheme editing to prevent constant context updates on every keystroke
  const [localScheme, setLocalScheme] = useState<GradeSymbol[]>(gradingScheme);

  const handleSaveKey = () => {
    setApiKey(tempKey);
    if (tempKey) {
      showSuccess("API Key saved successfully.");
    } else {
      showSuccess("API Key removed.");
    }
  };

  const handleSchemeChange = (index: number, field: keyof GradeSymbol, value: any) => {
    const updated = [...localScheme];
    updated[index] = { ...updated[index], [field]: value };
    setLocalScheme(updated);
  };

  const handleSaveScheme = () => {
    // Basic validation
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
      // We need to sync local state after reset, but since resetGradingScheme updates context, 
      // and we initialize local state from context, we might need a useEffect or just manual update here.
      // However, the cleanest way is to let the context update trigger a re-render if we depended on it directly,
      // but here we have local state. Let's just manually reset local state to match defaults.
      // Ideally, we'd import defaultGradingScheme here, but let's just wait for context or force reload.
      // Simpler:
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
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences and integrations.</p>
      </div>
      
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>AI Integration</CardTitle>
          </div>
          <CardDescription>
            Configure your Google Gemini API key to enable AI features like scanning and insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="api-key">Gemini API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder="Enter your API key..."
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">Toggle password visibility</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
          <Button onClick={handleSaveKey}>
            <Save className="mr-2 h-4 w-4" /> Save Configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grading System</CardTitle>
              <CardDescription>
                Customize the grade ranges, symbols, and levels used for analysis.
              </CardDescription>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={handleResetScheme}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset Defaults
              </Button>
              <Button size="sm" onClick={handleSaveScheme}>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min %</TableHead>
                    <TableHead>Max %</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localScheme.map((grade, index) => (
                    <TableRow key={grade.id || index}>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 w-20" 
                          value={grade.min} 
                          onChange={(e) => handleSchemeChange(index, 'min', parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 w-20" 
                          value={grade.max} 
                          onChange={(e) => handleSchemeChange(index, 'max', parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          className="h-8 w-20" 
                          value={grade.symbol} 
                          onChange={(e) => handleSchemeChange(index, 'symbol', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                         <Input 
                          type="number" 
                          className="h-8 w-20" 
                          value={grade.level} 
                          onChange={(e) => handleSchemeChange(index, 'level', parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRow(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-2 border-t bg-muted/20">
                <Button variant="ghost" size="sm" className="w-full" onClick={handleAddRow}>
                  <Plus className="mr-2 h-4 w-4" /> Add Range
                </Button>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;