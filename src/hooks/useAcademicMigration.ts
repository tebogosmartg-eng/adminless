"use client";

import { useCallback } from 'react';
import { db } from '@/db';
import { queueAction } from '@/services/sync';

interface MigrationReport {
    success: boolean;
    counts: { [table: string]: number };
    total: number;
}

export const useAcademicMigration = (
  userId: string | undefined, 
  recalculateAverages: (silent?: boolean) => Promise<void>,
  logActivity: (message: string, yearId?: string, termId?: string) => Promise<void>
) => {
  const migrateLegacyData = useCallback(async (yearId: string, termId: string): Promise<MigrationReport> => {
    const report: MigrationReport = { success: false, counts: {}, total: 0 };
    const tables = ['classes', 'assessments', 'activities', 'todos', 'learner_notes', 'evidence', 'attendance'];

    try {
        await db.transaction('rw', [
            db.classes, db.assessments, db.activities, db.todos, 
            db.learner_notes, db.evidence, db.attendance, db.sync_queue, db.learners
        ], async () => {
            for (const table of tables) {
                // @ts-ignore
                const all = await db[table].toArray();
                
                const legacy = all.filter((i: any) => {
                    const needsYear = ['classes', 'activities', 'todos', 'learner_notes', 'evidence'].includes(table);
                    const hasYear = needsYear ? !!i.year_id : true;
                    const hasTerm = !!i.term_id;
                    return !hasYear || !hasTerm;
                });
                
                if (legacy.length > 0) {
                    const updates = legacy.map((item: any) => {
                        const newItem = { ...item };
                        if (['classes', 'activities', 'todos', 'learner_notes', 'evidence'].includes(table)) {
                            newItem.year_id = yearId;
                        }
                        newItem.term_id = termId;
                        if (!newItem.user_id) newItem.user_id = userId;
                        if (table === 'classes' && newItem.class_name && !newItem.className) {
                            newItem.className = newItem.class_name;
                            delete newItem.class_name;
                        }
                        return newItem;
                    });
                    // @ts-ignore
                    await db[table].bulkPut(updates);
                    await queueAction(table, 'upsert', updates);
                    report.counts[table] = legacy.length;
                    report.total += legacy.length;
                }
            }
        });

        if (report.total > 0) {
            await recalculateAverages(true);
        }
        report.success = true;
        return report;
    } catch (e) {
        console.error("[Infrastructure] Alignment check failed:", e);
        return { ...report, success: false };
    }
  }, [userId, recalculateAverages]);

  const resetToTermOne = useCallback(async (yearId: string, termOneId: string): Promise<MigrationReport> => {
    const report: MigrationReport = { success: false, counts: {}, total: 0 };
    // Tables that directly possess a term_id column in the schema
    const tables = ['classes', 'assessments', 'activities', 'todos', 'learner_notes', 'evidence', 'attendance'];

    try {
        await db.transaction('rw', [
            db.classes, db.assessments, db.activities, db.todos, 
            db.learner_notes, db.evidence, db.attendance, db.sync_queue, db.learners
        ], async () => {
            for (const table of tables) {
                // @ts-ignore
                const all = await db[table].toArray();
                
                // Identify records that need moving (everything not already in Term 1)
                const toMove = all.filter((i: any) => i.term_id !== termOneId);
                
                if (toMove.length > 0) {
                    const updates = toMove.map((item: any) => ({
                        ...item,
                        term_id: termOneId
                    }));

                    // @ts-ignore
                    await db[table].bulkPut(updates);
                    await queueAction(table, 'upsert', updates);
                    
                    report.counts[table] = toMove.length;
                    report.total += toMove.length;
                }
            }
        });

        await recalculateAverages(true);
        await logActivity(`[SYSTEM RESET] Consolidated ${report.total} records into Term 1.`, yearId, termOneId);
        
        report.success = true;
        return report;
    } catch (e) {
        console.error("[Infrastructure] Academic reset failed:", e);
        return { ...report, success: false };
    }
  }, [recalculateAverages, logActivity]);

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

        await db.transaction('rw', [db.classes, db.learners, db.sync_queue], async () => {
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

  return { migrateLegacyData, resetToTermOne, rollForwardClasses };
};