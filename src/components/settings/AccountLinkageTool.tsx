"use client";

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    UserCircle2, 
    AlertCircle, 
    Terminal, 
    Copy, 
    Check, 
    ShieldAlert, 
    Search,
    Database,
    Loader2
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

export const AccountLinkageTool = () => {
  const { teacherName, schoolName } = useSettings();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check current auth status
  useMemo(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  }, []);

  const classCount = useLiveQuery(() => db.classes.count()) || 0;
  const isProfileEmpty = classCount === 0 && (!teacherName || teacherName === "");

  const migrationSQL = useMemo(() => {
    if (!currentUserId) return "-- Loading User ID...";
    
    return `-- AdminLess Account Recovery Script
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. IDENTIFY THE SOURCE (OLD) USER ID
-- Use this query to find your old profile by teacher name
-- SELECT id, teacher_name, school_name FROM profiles WHERE teacher_name ILIKE '%${teacherName || "YOUR_NAME"}%';

-- 2. PERFORM THE LINKAGE FIX (Replace 'OLD_UUID_HERE' with the ID found above)
-- DO NOT RUN UNTIL YOU HAVE THE OLD UUID
/*
BEGIN;
  -- Update all tables to the new ID: ${currentUserId}
  UPDATE classes SET user_id = '${currentUserId}' WHERE user_id = 'OLD_UUID_HERE';
  UPDATE academic_years SET user_id = '${currentUserId}' WHERE user_id = 'OLD_UUID_HERE';
  UPDATE profiles SET id = '${currentUserId}' WHERE id = 'OLD_UUID_HERE' 
    ON CONFLICT (id) DO UPDATE SET 
    teacher_name = EXCLUDED.teacher_name, 
    school_name = EXCLUDED.school_name;
    
  -- Mark the empty/new auto-generated profile for deletion (optional)
  -- DELETE FROM profiles WHERE id = '${currentUserId}' AND teacher_name = '';
COMMIT;
*/`.trim();
  }, [currentUserId, teacherName]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(migrationSQL);
    setCopied(true);
    showSuccess("Migration script copied.");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Card className="border-red-200 bg-red-50/10 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <CardTitle>Account Linkage Repair</CardTitle>
        </div>
        <CardDescription>
          Resolve profile mismatches caused by login provider changes or UUID drift.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-white border shadow-sm">
            <div className={`p-3 rounded-full ${isProfileEmpty ? 'bg-amber-100' : 'bg-green-100'}`}>
                {isProfileEmpty ? <AlertCircle className="h-6 w-6 text-amber-600" /> : <Check className="h-6 w-6 text-green-600" />}
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-sm">
                    {isProfileEmpty ? "Empty Profile Detected" : "Data Linkage Healthy"}
                </h4>
                <p className="text-xs text-muted-foreground">
                    Current ID: <code className="bg-muted px-1 rounded">{currentUserId || "..." }</code>
                </p>
                {isProfileEmpty && (
                    <p className="text-[11px] text-amber-700 mt-1 font-medium">
                        This account has 0 classes. Historical data likely exists under a different UUID.
                    </p>
                )}
            </div>
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Terminal className="h-3 w-3" /> SQL Recovery Payload
                </h5>
                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={copyToClipboard}>
                    {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? "Copied" : "Copy SQL"}
                </Button>
            </div>
            <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-300 rounded-lg text-[10px] font-mono overflow-x-auto max-h-[200px] border border-slate-800">
                    {migrationSQL}
                </pre>
            </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3">
            <Database className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-[11px] text-blue-900 leading-relaxed">
                <p className="font-bold mb-1">How to fix this:</p>
                <ol className="list-decimal pl-4 space-y-1">
                    <li>Copy the SQL script above.</li>
                    <li>Go to your <strong>Supabase Dashboard</strong> {'>'} SQL Editor.</li>
                    <li>Follow the instructions inside the script to find your old UUID.</li>
                    <li>Execute the transaction to re-link your data to your current login.</li>
                </ol>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};