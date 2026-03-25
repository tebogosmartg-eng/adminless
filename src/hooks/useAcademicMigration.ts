"use client";

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';

export const useAcademicMigration = (
  userId: string | undefined,
  logActivity: (message: string, yearId?: string, termId?: string) => Promise<void>
) => {
  const rollForwardClasses = useCallback(async (
    yearId: string,
    sourceTermId: string,
    targetTermId: string,
    preparedClasses: any[],
    onSuccess?: (targetTerm: any) => void
  ) => {
    if (!userId || !yearId) return;
    
    try {
        const { data: sourceTerm } = await supabase.from('terms').select('*').eq('id', sourceTermId).single();
        const { data: targetTerm } = await supabase.from('terms').select('*').eq('id', targetTermId).single();
        if (!sourceTerm || !targetTerm) throw new Error("Invalid term context.");

        const classesToQueue: any[] = [];
        const learnersToQueue: any[] = [];

        for (const sClass of preparedClasses) {
            const newClassId = crypto.randomUUID();
            const newClass = {
                id: newClassId,
                user_id: userId,
                year_id: yearId,
                term_id: targetTermId,
                grade: sClass.grade,
                subject: sClass.subject,
                className: sClass.className,
                archived: false,
                notes: `Clean roster rolled forward from ${sourceTerm.name}`,
                created_at: new Date().toISOString()
            };
            classesToQueue.push(newClass);

            const newLearners = sClass.learners.map((l: any) => ({
                id: crypto.randomUUID(),
                user_id: userId,
                class_id: newClassId,
                name: l.name
            }));
            if (newLearners.length > 0) {
                learnersToQueue.push(...newLearners);
            }
        }

        for (const cls of classesToQueue) {
            await queueAction('classes', 'create', cls);
        }
        if (learnersToQueue.length > 0) {
            await queueAction('learners', 'create', learnersToQueue);
        }

        const auditLog = `[AUDIT: ROLL_FORWARD] Source: ${sourceTerm.name} Target: ${targetTerm.name} (${preparedClasses.length} Rosters)`;
        await logActivity(auditLog, yearId, targetTermId);
        
        if (onSuccess) onSuccess(targetTerm);
        
    } catch (e: any) {
        console.error("[Infrastructure] Roll forward failed:", e);
    }
  }, [userId, logActivity]);

  return { rollForwardClasses };
};