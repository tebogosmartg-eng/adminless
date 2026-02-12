"use client";

import { db } from '@/db';
import { queueAction } from '@/services/sync';

interface MigrationReport {
    success: boolean;
    counts: { [table: string]: number };
    total: number;
}

export const useAcademicMigration = (
  userId: string | undefined, 
  recalculateAverages: () => Promise<void>,
  logActivity: (message: string, yearId?: string, termId?: string) => Promise<void>
) => {
  const migrateLegacyData = async (yearId: string, termId: string): Promise<MigrationReport> => {
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
                const legacy = all.filter((i: any) => !i.year_id || !i.term_id);
                
                if (legacy.length > 0) {
                    const updates = legacy.map((item: any) => {
                        const newItem = {
                            ...item,
                            year_id: yearId,
                            term_id: termId,
                            user_id: item.user_id || userId
                        };

                        // Ensure proper camelCase mapping during migration for classes
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
            await recalculateAverages();
            // Logging to console only as requested for infrastructure invisibility
            console.log(`[Infrastructure] Data Alignment Complete: ${report.total} records migrated to current cycle (${yearId} / ${termId}).`);
        }

        report.success = true;
        return report;
    } catch (e) {
        console.error("[Infrastructure] Alignment check failed:", e);
        return { ...report, success: false };
    }
  };

  const rollForwardClasses = async (
    yearId: string, 
    sourceTermId: string, 
    targetTermId: string, 
    preparedClasses: any[],
    onSuccess: (targetTerm: any) => void
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
        
    } catch (e: any) {
        console.error("[Infrastructure] Roll forward failed:", e);
    }
  };

  return { migrateLegacyData, rollForwardClasses };
};