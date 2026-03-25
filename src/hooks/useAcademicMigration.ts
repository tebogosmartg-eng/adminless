"use client";

import { useCallback } from 'react';
import { db } from '@/db';
import { queueAction } from '@/services/sync';

export const useAcademicMigration = (
  userId: string | undefined, 
  logActivity: (message: string, yearId?: string, termId?: string) => Promise<void>
) => {
  /**
   * ROLL FORWARD Rosters
   * Copies learner names from a source term to a target term.
   */
  const rollForwardClasses = useCallback(async (
    yearId: string, 
    sourceTermId: string, 
    targetTermId: string, 
    preparedClasses: any[],
    onSuccess?: (targetTerm: any) => void
  ) => {
    if (!userId || !yearId) return;
    
    try {
        const sourceTerm = await db.terms.get(sourceTermId);
        const targetTerm = await db.terms.get(targetTermId);
        if (!sourceTerm || !targetTerm) throw new Error("Invalid term context.");

        await db.transaction('rw', [db.classes, db.learners], async () => {
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
                await db.classes.add(newClass);
                await queueAction('classes', 'create', newClass);

                const newLearners = sClass.learners.map((l: any) => ({
                    id: crypto.randomUUID(),
                    class_id: newClassId,
                    name: l.name,
                    mark: "", 
                    comment: "" 
                }));
                if (newLearners.length > 0) {
                    await db.learners.bulkAdd(newLearners as any);
                    await queueAction('learners', 'create', newLearners);
                }
            }
        });

        const auditLog = `[AUDIT: ROLL_FORWARD] Source: ${sourceTerm.name} Target: ${targetTerm.name} (${preparedClasses.length} Rosters)`;
        await logActivity(auditLog, yearId, targetTermId);
        
        if (onSuccess) onSuccess(targetTerm);
        
    } catch (e: any) {
        console.error("[Infrastructure] Roll forward failed:", e);
    }
  }, [userId, logActivity]);

  return { rollForwardClasses };
};