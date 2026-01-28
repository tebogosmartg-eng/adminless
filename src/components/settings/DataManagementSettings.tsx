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

      // Fetch all data from Local DB
      const profile = await db.profiles.get(user.id);
      
      const classes = await db.classes.where('user_id').equals(user.id).toArray();
      const classIds = classes.map(c => c.id);
      
      const learners = await db.learners.where('class_id').anyOf(classIds).toArray();
      const learnerIds = learners.map(l => l.id!);

      const academic_years = await db.academic_years.where('user_id').equals(user.id).toArray();
      const terms = await db.terms.where('user_id').equals(user.id).toArray();
      
      const assessments = await db.assessments.where('user_id').equals(user.id).toArray();
      const assessmentIds = assessments.map(a => a.id);
      const assessment_marks = await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray();
      
      const attendance = await db.attendance.where('class_id').anyOf(classIds).toArray();
      const timetable = await db.timetable.where('user_id').equals(user.id).toArray();
      const learner_notes = await db.learner_notes.where('learner_id').anyOf(learnerIds).toArray();
      
      const todos = await db.todos.where('user_id').equals(user.id).toArray();
      const activities = await db.activities.where('user_id').equals(user.id).toArray();

      const backupData = {
        version: '3.0',
        timestamp: new Date().toISOString(),
        profile,
        classes,
        learners,
        academic_years,
        terms,
        assessments,
        assessment_marks,
        attendance,
        timetable,
        learner_notes,
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
      showSuccess("Full backup downloaded successfully.");
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

        // Helper to process a table
        const restoreTable = async (tableName: string, items: any[]) => {
            if (!items || !Array.isArray(items) || items.length === 0) return 0;
            
            // Map items to current user ID to prevent ownership issues on restore
            const safeItems = items.map(item => ({
                ...item,
                user_id: item.user_id ? user.id : undefined // Only override if field exists
            }));

            // @ts-ignore
            await db[tableName].bulkPut(safeItems);
            // Queue sync for each item (bulk would be better but sync service takes array)
            await queueAction(tableName, 'upsert', safeItems);
            return safeItems.length;
        };

        // 1. Profile
        if (data.profile) {
          const profileData = { id: user.id, ...data.profile, updated_at: new Date().toISOString() };
          await db.profiles.put(profileData);
          await queueAction('profiles', 'upsert', profileData);
        }

        // 2. Classes (Legacy structure support: classes might contain learners in v2.1)
        if (data.classes) {
            // Check if v2.1 structure (learners nested)
            if (data.classes.some((c: any) => c.learners)) {
                // Flatten logic
                const flattenedClasses = data.classes.map((c: any) => {
                    const { learners, ...cls } = c;
                    return { ...cls, user_id: user.id };
                });
                await restoreTable('classes', flattenedClasses);

                const flattenedLearners = data.classes.flatMap((c: any) => 
                    (c.learners || []).map((l: any) => ({ ...l, class_id: c.id }))
                );
                await restoreTable('learners', flattenedLearners);
            } else {
                // v3.0 Flat structure
                await restoreTable('classes', data.classes);
            }
        }

        // 3. Other Tables (v3.0)
        await restoreTable('learners', data.learners); // Will run if flat learners array exists
        await restoreTable('academic_years', data.academic_years);
        await restoreTable('terms', data.terms);
        await restoreTable('assessments', data.assessments);
        await restoreTable('assessment_marks', data.assessment_marks);
        await restoreTable('attendance', data.attendance);
        await restoreTable('timetable', data.timetable);
        await restoreTable('learner_notes', data.learner_notes);
        await restoreTable('todos', data.todos);
        
        showSuccess("Data import complete. Reloading...");
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
      await db.transaction('rw', [
        db.classes, 
        db.learners, 
        db.todos, 
        db.activities, 
        db.sync_queue, 
        db.attendance, 
        db.assessments, 
        db.assessment_marks,
        db.academic_years,
        db.terms,
        db.timetable,
        db.learner_notes
      ], async () => {
          await db.learners.clear();
          await db.classes.clear();
          await db.todos.clear();
          await db.activities.clear();
          await db.attendance.clear();
          await db.assessments.clear();
          await db.assessment_marks.clear();
          await db.academic_years.clear();
          await db.terms.clear();
          await db.timetable.clear();
          await db.learner_notes.clear();
          
          await db.sync_queue.clear();
      });

      if (isOnline) {
          // Cascading deletes on server usually handle most, but explicit safety:
          await supabase.from('classes').delete().eq('user_id', user.id);
          await supabase.from('academic_years').delete().eq('user_id', user.id);
          await supabase.from('todos').delete().eq('user_id', user.id);
          await supabase.from('timetable').delete().eq('user_id', user.id);
          showSuccess("Application data reset locally and on server.");
      } else {
          showSuccess("Application data reset locally.");
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
            <p className="text-sm text-muted-foreground">Download a JSON file containing all classes, assessments, and settings.</p>
          </div>
          <Button onClick={handleExportData} variant="outline" disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Full Backup
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg bg-muted/20">
          <div>
            <h3 className="font-semibold mb-1">Restore Data</h3>
            <p className="text-sm text-muted-foreground">Upload a backup file to restore your data. <span className="text-amber-600 font-medium">Overwrites existing IDs.</span></p>
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
            <p className="text-sm text-muted-foreground">Permanently remove all classes, assessments, and settings.</p>
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
                  This action cannot be undone. This will permanently delete <strong>ALL</strong> data including classes, learners, assessments, marks, and settings.
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