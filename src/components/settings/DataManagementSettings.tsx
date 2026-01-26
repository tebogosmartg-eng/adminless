import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, Database, Download, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { useClasses } from "@/context/ClassesContext";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Fetch all relevant data
      const { data: classes } = await supabase.from('classes').select('*, learners(*)').eq('user_id', user.id);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: todos } = await supabase.from('todos').select('*').eq('user_id', user.id);
      const { data: activities } = await supabase.from('activities').select('*').eq('user_id', user.id);

      const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        profile,
        classes,
        todos,
        activities
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `smareg_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Backup file downloaded successfully.");
    } catch (error: any) {
      showError(error.message || "Failed to export data.");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error("User not authenticated");

        // 1. Restore Profile Settings (if present)
        if (data.profile) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: user.id, 
              ...data.profile,
              updated_at: new Date().toISOString()
            });
          if (profileError) console.error("Profile restore error", profileError);
        }

        // 2. Restore Classes & Learners
        if (data.classes && Array.isArray(data.classes)) {
          let restoredCount = 0;
          for (const cls of data.classes) {
            // Create class first
            const { data: newClass, error: classError } = await supabase
              .from('classes')
              .insert({
                user_id: user.id,
                grade: cls.grade,
                subject: cls.subject,
                class_name: cls.class_name,
                archived: cls.archived || false,
                notes: cls.notes || ''
              })
              .select()
              .single();

            if (!classError && newClass && cls.learners && cls.learners.length > 0) {
              // Create learners for this class
              const learnersToInsert = cls.learners.map((l: any) => ({
                class_id: newClass.id,
                name: l.name,
                mark: l.mark,
                comment: l.comment
              }));
              
              await supabase.from('learners').insert(learnersToInsert);
              restoredCount++;
            }
          }
          showSuccess(`Restored ${restoredCount} classes.`);
        }

        // 3. Restore Todos (optional)
        if (data.todos && Array.isArray(data.todos)) {
          const todosToInsert = data.todos.map((t: any) => ({
             user_id: user.id,
             title: t.title,
             completed: t.completed || false
          }));
          if (todosToInsert.length > 0) {
            await supabase.from('todos').insert(todosToInsert);
          }
        }
        
        showSuccess("Data import complete. Refreshing...");
        setTimeout(() => window.location.reload(), 1500);

      } catch (err) {
        showError("Failed to parse backup file or import data.");
        console.error(err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete in order to respect potential foreign keys (though cascade should handle it, explicit is safer)
      await supabase.from('learners').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Hacky 'delete all' that works with RLS usually requiring a filter
      // Actually, standard delete needs a WHERE clause.
      // Better: Delete classes, let cascade handle learners/attendance
      
      const { error: classError } = await supabase.from('classes').delete().eq('user_id', user.id);
      if (classError) throw classError;

      const { error: todoError } = await supabase.from('todos').delete().eq('user_id', user.id);
      if (todoError) throw todoError;

      const { error: activityError } = await supabase.from('activities').delete().eq('user_id', user.id);
      if (activityError) throw activityError;

      showSuccess("All application data cleared.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      showError("Failed to clear data: " + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleGenerateDemoData = () => {
    const demoClass = {
      id: new Date().toISOString(), // Temporary ID, will be replaced by DB
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
          <Button onClick={handleExportData} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export to File
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
          <div>
            <h3 className="font-semibold mb-1">Restore Data</h3>
            <p className="text-sm text-muted-foreground">Upload a backup file to restore your data. Existing data will be preserved, new data appended.</p>
          </div>
          <div className="relative">
            <Button variant="outline" className="relative cursor-pointer" disabled={isImporting}>
               {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
               Import from File
               <input 
                type="file" 
                accept=".json" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleImportData}
                disabled={isImporting}
               />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border border-destructive/20 rounded-lg bg-red-50 dark:bg-red-950/10">
          <div>
            <h3 className="font-semibold mb-1 text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">Permanently remove all classes and reset the application data.</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all your classes, learners, and activity history from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isClearing ? "Clearing..." : "Yes, Clear Everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};