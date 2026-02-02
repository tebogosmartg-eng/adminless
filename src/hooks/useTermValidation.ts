import { useState } from 'react';
import { db } from '@/db';

export interface ValidationError {
  type: 'weight' | 'marks' | 'evidence';
  className: string;
  subject: string;
  details: string;
}

export const useTermValidation = () => {
  const [validating, setValidating] = useState(false);

  const validateTerm = async (termId: string): Promise<{ isValid: boolean; errors: ValidationError[] }> => {
    setValidating(true);
    const errors: ValidationError[] = [];

    try {
      const assessments = await db.assessments
        .where('term_id')
        .equals(termId)
        .toArray();

      if (!assessments || assessments.length === 0) {
        setValidating(false);
        return { isValid: true, errors: [] };
      }

      const classGroups: { [classId: string]: typeof assessments } = {};
      assessments.forEach(ass => {
        if (!classGroups[ass.class_id]) classGroups[ass.class_id] = [];
        classGroups[ass.class_id].push(ass);
      });

      // Get all evidence for this term to check compliance
      const termEvidence = await db.evidence.where('term_id').equals(termId).toArray();
      const classesWithEvidence = new Set(termEvidence.map(e => e.class_id));

      for (const classId in classGroups) {
        const classAss = classGroups[classId];
        const classInfo = await db.classes.get(classId);
        
        const className = classInfo?.className || "Unknown Class";
        const subject = classInfo?.subject || "Unknown Subject";

        // 1. Weight Validation
        const totalWeight = classAss.reduce((sum, a) => sum + Number(a.weight), 0);
        if (totalWeight !== 100) {
          errors.push({
            type: 'weight',
            className,
            subject,
            details: `Total weighting is ${totalWeight}% (must be 100%).`
          });
        }

        // 2. Marks Validation
        const learners = await db.learners.where('class_id').equals(classId).toArray();
        if (learners.length > 0) {
            const assessmentIds = classAss.map(a => a.id);
            const marks = await db.assessment_marks
              .where('assessment_id')
              .anyOf(assessmentIds)
              .toArray();

            let missingCount = 0;
            classAss.forEach(ass => {
              learners.forEach((l) => {
                if (!l.id) return;
                const markEntry = marks.find(m => m.assessment_id === ass.id && m.learner_id === l.id);
                if (!markEntry || markEntry.score === null || markEntry.score === undefined) {
                  missingCount++;
                }
              });
            });

            if (missingCount > 0) {
              errors.push({
                type: 'marks',
                className,
                subject,
                details: `${missingCount} marks are missing across ${classAss.length} assessments.`
              });
            }
        }

        // 3. Evidence Validation (NEW)
        if (!classesWithEvidence.has(classId)) {
            errors.push({
                type: 'evidence',
                className,
                subject,
                details: `No moderation evidence attached. Upload at least one script or note for audit.`
            });
        }
      }

    } catch (error) {
      console.error("Validation error:", error);
      errors.push({ type: 'weight', className: 'System', subject: 'Error', details: 'Failed to run validation check locally.' });
    } finally {
      setValidating(false);
    }

    return { isValid: errors.length === 0, errors };
  };

  return { validateTerm, validating };
};