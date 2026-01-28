import { useState } from 'react';
import { db } from '@/db';

export interface ValidationError {
  type: 'weight' | 'marks';
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
      // 1. Get all assessments for this term from Local DB
      const assessments = await db.assessments
        .where('term_id')
        .equals(termId)
        .toArray();

      if (!assessments || assessments.length === 0) {
        setValidating(false);
        return { isValid: true, errors: [] };
      }

      // Group assessments by Class
      const classGroups: { [classId: string]: typeof assessments } = {};
      assessments.forEach(ass => {
        if (!classGroups[ass.class_id]) classGroups[ass.class_id] = [];
        classGroups[ass.class_id].push(ass);
      });

      // 2. Validate Weights per Class
      for (const classId in classGroups) {
        const classAss = classGroups[classId];
        
        // Get Class Info
        const classInfo = await db.classes.get(classId);
        
        const className = classInfo?.className || "Unknown Class";
        const subject = classInfo?.subject || "Unknown Subject";

        const totalWeight = classAss.reduce((sum, a) => sum + Number(a.weight), 0);

        if (totalWeight !== 100) {
          errors.push({
            type: 'weight',
            className,
            subject,
            details: `Total weighting is ${totalWeight}% (must be 100%).`
          });
        }

        // 3. Validate Missing Marks
        // Get learners for this class
        const learners = await db.learners
            .where('class_id')
            .equals(classId)
            .toArray();
            
        if (learners.length === 0) continue; // Skip empty classes

        const assessmentIds = classAss.map(a => a.id);
        
        // Fetch actual marks
        const marks = await db.assessment_marks
          .where('assessment_id')
          .anyOf(assessmentIds)
          .toArray();

        const marksMap = new Set(marks.map(m => `${m.assessment_id}-${m.learner_id}`));

        let missingCount = 0;
        
        classAss.forEach(ass => {
          learners.forEach((l) => {
            // Check if mark exists AND is not null?
            // Usually existence in DB with value means it's there. 
            // In our system, we might delete marks or store them as null.
            if (!l.id) return; // Unsynced/created learner should have ID if saved.
            
            const key = `${ass.id}-${l.id}`;
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