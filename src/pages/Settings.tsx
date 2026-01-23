import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { Save, RotateCcw, Plus, Trash2, Download, Upload, AlertTriangle, FileJson, School, User, Database, AlertCircle, ImagePlus, MessageSquareQuote } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useClasses } from "@/context/ClassesContext";
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
import { ScrollArea } from "@/components/ui/scroll-area";

const Settings = () => {
  const { 
    gradingScheme, updateGradingScheme, resetGradingScheme,
    schoolName, setSchoolName,
    teacherName, setTeacherName,
    schoolLogo, setSchoolLogo,
    atRiskThreshold, setAtRiskThreshold,
    commentBank, addToCommentBank, removeFromCommentBank
  } = useSettings();

  const { addClass } = useClasses();
  
  // Local state for School Profile
  const [tempSchoolName, setTempSchoolName] = useState(schoolName);
  const [tempTeacherName, setTempTeacherName] = useState(teacherName);
  const [tempThreshold, setTempThreshold] = useState(atRiskThreshold.toString());
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for grading scheme editing
  const [localScheme, setLocalScheme] = useState<GradeSymbol[]>(gradingScheme);
  
  // Local state for comment bank
  const [newComment, setNewComment] = useState("");

  const handleSaveProfile = () => {
    setSchoolName(tempSchoolName);
    setTeacherName(tempTeacherName);
    
    const thresh = parseInt(tempThreshold);
    if (!isNaN(thresh) && thresh >= 0 && thresh <= 100) {
      setAtRiskThreshold(thresh);
      showSuccess("School profile and thresholds updated.");
    } else {
      showError("Invalid threshold value. Must be between 0 and 100.");
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        showError("Image too large. Please use a logo smaller than 500KB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSchoolLogo(base64String);
        showSuccess("School logo updated.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSchoolLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    showSuccess("School logo removed.");
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
  
  const handleAddComment = () => {
    if (newComment.trim()) {
      addToCommentBank(newComment.trim());
      setNewComment("");
      showSuccess("Comment added to bank.");
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        classes: localStorage.getItem('classes'),
        grading_scheme: localStorage.getItem('grading_scheme'),
        activities: localStorage.getItem('activities'),
        school_name: localStorage.getItem('school_name'),
        teacher_name: localStorage.getItem('teacher_name'),
        school_logo: localStorage.getItem('school_logo'),
        at_risk_threshold: localStorage.getItem('at_risk_threshold'),
        comment_bank: localStorage.getItem('comment_bank'),
        timestamp: new Date().toISOString(),
        version: '1.2'
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
        if (data.school_logo) localStorage.setItem('school_logo', data.school_logo);
        if (data.at_risk_threshold) localStorage.setItem('at_risk_threshold', data.at_risk_threshold);
        if (data.comment_bank) localStorage.setItem('comment_bank', data.comment_bank);
        
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
    localStorage.clear(); // Clears everything including logo
    showSuccess("All application data cleared.");
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleGenerateDemoData = () => {
    const demoClass = {
      id: new Date().toISOString(),
      grade: "Grade 10",
      subject: "Mathematics",
      className: "10-Demo",
      learners: [
        { name: "Alice Smith", mark: "85", comment: "Excellent work, keep it up!" },
        { name: "Bob Johnson", mark: "42", comment: "Needs to focus more on algebra." },
        { name: "Charlie Brown", mark: "65", comment: "Good improvement this term." },
        { name: "David Wilson", mark: "32", comment: "Struggling with basics. Needs tutoring." },
        { name: "Eve Davis", mark: "91", comment: "Outstanding performance." },
        { name: "Frank Miller", mark: "55", comment: "Satisfactory, but can do better." },
        { name: "Grace Lee", mark: "78", comment: "Very consistent work." },
        { name: "Henry Ford", mark: "25", comment: "Critical: Did not submit homework." },
      ]
    };
    addClass(demoClass);
    showSuccess("Demo class '10-Demo' created successfully!");
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences.</p>
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
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center gap-2">
               <Label>School Logo</Label>
               <div className="h-32 w-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden relative group">
                  {schoolLogo ? (
                    <>
                      <img src={schoolLogo} alt="School Logo" className="h-full w-full object-contain p-1" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="destructive" size="icon" onClick={handleRemoveLogo}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </>
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted-foreground opacity-50" />
                  )}
               </div>
               <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="relative cursor-pointer" asChild>
                    <label>
                       Upload
                       <input 
                        ref={logoInputRef}
                        type="file" 
                        accept="image/png, image/jpeg" 
                        className="hidden" 
                        onChange={handleLogoUpload}
                       />
                    </label>
                  </Button>
               </div>
               <p className="text-[10px] text-muted-foreground max-w-[150px] text-center">
                 Max 500KB. PNG or JPG. Used in PDF reports.
               </p>
            </div>

            {/* Fields Section */}
            <div className="flex-1 space-y-4">
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
                 <div className="grid w-full items-center gap-1.5 sm:col-span-2">
                  <Label htmlFor="threshold" className="flex items-center gap-2">
                    At Risk Threshold (%)
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <div className="relative">
                    <Input
                      id="threshold"
                      type="number"
                      placeholder="50"
                      min={0}
                      max={100}
                      value={tempThreshold}
                      onChange={(e) => setTempThreshold(e.target.value)}
                      className="w-full sm:w-[120px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Learners scoring below this percentage will be highlighted as "At Risk".
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" /> Save Profile & Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
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

        <Card className="h-full flex flex-col">
            <CardHeader>
               <div className="flex items-center gap-2">
                  <MessageSquareQuote className="h-5 w-5 text-primary" />
                  <CardTitle>Comment Bank</CardTitle>
               </div>
               <CardDescription>
                  Save frequently used comments for quick access.
               </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
               <div className="flex gap-2">
                  <Input 
                    placeholder="Type a new comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>Add</Button>
               </div>
               
               <ScrollArea className="flex-1 h-[240px] border rounded-md p-2">
                  {commentBank.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                       No saved comments yet.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {commentBank.map((comment, index) => (
                        <li key={index} className="flex items-center justify-between p-2 bg-muted/40 rounded-md hover:bg-muted group">
                           <span className="text-sm truncate mr-2">{comment}</span>
                           <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => removeFromCommentBank(comment)}>
                              <Trash2 className="h-3 w-3" />
                           </Button>
                        </li>
                      ))}
                    </ul>
                  )}
               </ScrollArea>
            </CardContent>
        </Card>
      </div>

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
              <h3 className="font-semibold mb-1">Generate Demo Data</h3>
              <p className="text-sm text-muted-foreground">Add a sample class with random learners to test features.</p>
            </div>
            <Button onClick={handleGenerateDemoData} variant="outline" className="text-primary hover:text-primary">
              <Database className="mr-2 h-4 w-4" /> Create Demo Class
            </Button>
          </div>

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