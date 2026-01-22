import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { Eye, EyeOff, Save, ShieldCheck, RotateCcw, Plus, Trash2, Download, Upload, AlertTriangle, FileJson, School, User } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { GradeSymbol } from "@/utils/grading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const { 
    apiKey, setApiKey, 
    gradingScheme, updateGradingScheme, resetGradingScheme,
    schoolName, setSchoolName,
    teacherName, setTeacherName
  } = useSettings();

  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  
  // Local state for School Profile
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);
  const [tempTeacherName, setTempTeacherName] = useState(teacherName);
  
  // Local state for grading scheme editing
  const [localScheme, setLocalScheme] = useState<GradeSymbol[]>(gradingScheme);

  const handleSaveKey = () => {
    setApiKey(tempKey);
    if (tempKey) {
      showSuccess("API Key saved successfully.");
    } else {
      showSuccess("API Key removed.");
    }
  };

  const handleSaveProfile = () => {
    setSchoolName(tempSchoolName);
    setTeacherName(tempTeacherName);
    showSuccess("School profile updated.");
  };

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

  const handleExportData = () => {
    try {
      const data = {
        classes: localStorage.getItem('classes'),
        grading_scheme: localStorage.getItem('grading_scheme'),
        activities: localStorage.getItem('activities'),
        school_name: localStorage.getItem('school_name'),
        teacher_name: localStorage.getItem('teacher_name'),
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smareg_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Backup file downloaded successfully.");
    } catch (error) {
      showError("Failed to export data.");
      console.error(error);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.classes) localStorage.setItem('classes', data.classes);
        if (data.grading_scheme) localStorage.setItem('grading_scheme', data.grading_scheme);
        if (data.activities) localStorage.setItem('activities', data.activities);
        if (data.school_name) localStorage.setItem('school_name', data.school_name);
        if (data.teacher_name) localStorage.setItem('teacher_name', data.teacher_name);
        
        showSuccess("Data restored successfully. Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        showError("Failed to parse backup file. Invalid format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearData = () => {
    localStorage.removeItem('classes');
    localStorage.removeItem('activities');
    localStorage.removeItem('grading_scheme');
    localStorage.removeItem('school_name');
    localStorage.removeItem('teacher_name');
    // We keep the API key to avoid annoyance
    showSuccess("All application data cleared.");
    setTimeout(() => window.location.reload(), 1000);
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
            <School className="h-5 w-5 text-primary" />
            <CardTitle>School & Report Profile</CardTitle>
          </div>
          <CardDescription>
            These details will appear on your generated PDF reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="school-name">School Name</Label>
              <div className="relative">
                <School className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="school-name"
                  placeholder="e.g. Sunnydale High School"
                  value={tempSchoolName}
                  onChange={(e) => setTempSchoolName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="teacher-name">Teacher Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="teacher-name"
                  placeholder="e.g. Mr. Smith"
                  value={tempTeacherName}
                  onChange={(e) => setTempTeacherName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveProfile}>
            <Save className="mr-2 h-4 w-4" /> Save Profile
          </Button>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle>Data Management</CardTitle>
          </div>
          <CardDescription>
            Backup your data to a file or restore from a previous backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
            <div>
              <h3 className="font-semibold mb-1">Backup Data</h3>
              <p className="text-sm text-muted-foreground">Download a JSON file containing all your classes and settings.</p>
            </div>
            <Button onClick={handleExportData} variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export to File
            </Button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
            <div>
              <h3 className="font-semibold mb-1">Restore Data</h3>
              <p className="text-sm text-muted-foreground">Upload a backup file to restore your data. Current data will be overwritten.</p>
            </div>
            <div className="relative">
              <Button variant="outline" className="relative cursor-pointer">
                 <Upload className="mr-2 h-4 w-4" /> Import from File
                 <input 
                  type="file" 
                  accept=".json" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleImportData}
                 />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border border-destructive/20 rounded-lg bg-red-50 dark:bg-red-950/10">
            <div>
              <h3 className="font-semibold mb-1 text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">Permanently remove all classes and reset the application.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="mr-2 h-4 w-4" /> Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all your classes, learners, and activity history from this browser.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Clear Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;