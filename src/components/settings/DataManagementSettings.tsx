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
import { db } from "@/db";
import { queueAction } from "@/services/sync";
import { useSync } from "@/context/SyncContext";

export const DataManagementSettings = () => {
  const { addClass } = useClasses();
  const { isOnline } = useSync();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Export from Local DB to ensure we have latest offline changes too
      
      const classes = await db.classes.where('user_id').equals(user.id).toArray();
      // Need learners for these classes
      const classIds = classes.map(c => c.id);
      const learners = await db.learners.where('class_id').anyOf(classIds).toArray();
      
      // We need to reconstruct the class structure expected by the backup format
      const classesWithLearners = classes.map(c => ({
          ...c,
          learners: learners.filter(l => l.class_id === c.id)
      }));

      const profile = await db.profiles.get(user.id);
      const todos = await db.todos.where('user_id').equals(user.id).toArray();
      const activities = await db.activities.where('user_id').equals(user.id).toArray();

      const backupData = {
        version: '2.1', // Bump version for local-first structure
        timestamp: new Date().toISOString(),
        profile,
        classes: classesWithLearners,
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

        // 1. Restore Profile Settings
        if (data.profile) {
          const profileData = { 
              id: user.id, 
              ...data.profile,
              updated_at: new Date().toISOString()
          };
          
          await db.profiles.put(profileData);
          await queueAction('profiles', 'upsert', profileData);
        }

        // 2. Restore Classes & Learners
        if (data.classes && Array.isArray(data.classes)) {
          let restoredCount = 0;
          for (const cls of data.classes) {
            
            const existing = await db.classes.get(cls.id);
            const classId = existing ? cls.id : (cls.id || crypto.randomUUID());
            
            const classData = {
                id: classId,
                user_id: user.id,
                grade: cls.grade,
                subject: cls.subject,
                className: cls.className || cls.class_name, // Handle both versions
                class_name: cls.className || cls.class_name, // DB expects class_name often for Supabase sync
                archived: cls.archived || false,
                notes: cls.notes || '',
                created_at: cls.created_at || new Date().toISOString()
            };

            await db.classes.put(classData);
            
            // Clean payload for sync
            const syncClass = { ...classData };
            delete (syncClass as any).className;
            await queueAction('classes', 'upsert', syncClass);

            if (cls.learners && cls.learners.length > 0) {
              const learnersToInsert = cls.learners.map((l: any) => ({
                id: l.id || crypto.randomUUID(),
                class_id: classId,
                name: l.name,
                mark: l.mark,
                comment: l.comment
              }));
              
              await db.learners.bulkPut(learnersToInsert);
              await queueAction('learners', 'upsert', learnersToInsert);
            }
            restoredCount++;
          }
          showSuccess(`Restored ${restoredCount} classes locally.`);
        }

        // 3. Restore Todos
        if (data.todos && Array.isArray(data.todos)) {
          const todosToInsert = data.todos.map((t: any) => ({
             id: t.id || crypto.randomUUID(),
             user_id: user.id,
             title: t.title,
             completed: t.completed || false,
             created_at: t.created_at || new Date().toISOString()
          }));
          
          if (todosToInsert.length > 0) {
            await db.todos.bulkPut(todosToInsert);
            await queueAction('todos', 'upsert', todosToInsert);
          }
        }
        
        showSuccess("Data import complete.");
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

      // Clear Local DB
      // Pass tables as an array to avoid Dexie transaction argument limit
      await db.transaction('rw', [
        db.classes, 
        db.learners, 
        db.todos, 
        db.activities, 
        db.sync_queue, 
        db.attendance, 
        db.assessments, 
        db.assessment_marks
      ], async () => {
          await db.learners.clear();
          await db.classes.clear();
          await db.todos.clear();
          await db.activities.clear();
          await db.attendance.clear();
          await db.assessments.clear();
          await db.assessment_marks.clear();
          
          // Clear sync queue to prevent re-pushing old actions
          await db.sync_queue.clear();
      });

      // If Online, also clear Server
      if (isOnline) {
          await supabase.from('classes').delete().eq('user_id', user.id);
          await supabase.from('todos').delete().eq('user_id', user.id);
          await supabase.from('activities').delete().eq('user_id', user.id);
          // Other tables cascade
          showSuccess("Application data reset locally and on server.");
      } else {
          showSuccess("Application data reset locally. Server data remains until manual cleanup.");
      }

      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      showError("Failed to clear data: " + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleGenerateDemoData = () => {
    const demoClass = {
      id: crypto.randomUUID(),
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
            <p className="text-sm text-muted-foreground">Upload a backup file to restore your data. Works offline.</p>
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
                  This action cannot be undone. This will permanently delete all your classes, learners, and activity history.
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