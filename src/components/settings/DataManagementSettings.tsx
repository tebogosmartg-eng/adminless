import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, Database, Download, Upload, AlertTriangle } from "lucide-react";
import { useClasses } from "@/context/ClassesContext";
import { showSuccess, showError } from "@/utils/toast";
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

export const DataManagementSettings = () => {
  const { addClass } = useClasses();

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
  );
};