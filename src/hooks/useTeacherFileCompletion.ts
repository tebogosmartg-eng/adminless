"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useMemo } from 'react';

export interface CompletionStep {
  id: string;
  label: string;
  isComplete: boolean;
  type: 'required' | 'recommended';
  link: string;
}

export const useTeacherFileCompletion = (termId: string, yearId: string) => {
  const stats = useLiveQuery(async () => {
    // 1. Resolve Classes
    const classes = await db.classes
        .where('[year_id+term_id]')
        .equals([yearId, termId])
        .toArray();
    
    const classIds = classes.map(c => c.id);

    // 2. Resolve Learners
    const learners = await db.learners
        .where('class_id')
        .anyOf(classIds)
        .toArray();

    // 3. Resolve Assessments
    const assessments = await db.assessments
        .where('term_id')
        .equals(termId)
        .filter(a => classIds.includes(a.class_id))
        .toArray();
    
    const assessmentIds = assessments.map(a => a.id);

    // 4. Resolve Marks
    const marks = await db.assessment_marks
        .where('assessment_id')
        .anyOf(assessmentIds)
        .filter(m => m.score !== null)
        .count();

    // 5. Resolve Diagnostics
    const diagnosticsCount = await db.diagnostics
        .filter(d => assessmentIds.includes(d.assessment_id))
        .count();

    // 6. Resolve Commentary (Annotations)
    const termName = (await db.terms.get(termId))?.name || "";
    const sectionKey = `${termName.toLowerCase().replace(' ', '')}.commentary`;
    const annotation = await db.teacher_file_annotations
        .where({ academic_year_id: yearId, term_id: termId, section_key: sectionKey })
        .first();
    
    const commentaryExists = !!annotation?.content?.trim();

    // 7. Resolve Evidence
    const evidenceCount = await db.evidence
        .where('term_id')
        .equals(termId)
        .count();

    const firstClassId = classIds.length > 0 ? classIds[0] : null;

    const steps: CompletionStep[] = [
        { 
            id: 'classes', 
            label: 'Active Classes Created', 
            isComplete: classes.length > 0, 
            type: 'required',
            link: '/classes'
        },
        { 
            id: 'learners', 
            label: 'Learner Rosters Compiled', 
            isComplete: learners.length > 0, 
            type: 'required',
            link: firstClassId ? `/classes/${firstClassId}` : '/classes'
        },
        { 
            id: 'assessments', 
            label: 'Formal Tasks (FATs) Defined', 
            isComplete: assessments.length > 0, 
            type: 'required',
            link: firstClassId ? `/classes/${firstClassId}` : '/classes'
        },
        { 
            id: 'marks', 
            label: 'Assessment Marks Captured', 
            isComplete: marks > 0, 
            type: 'required',
            link: firstClassId ? `/classes/${firstClassId}` : '/classes'
        },
        { 
            id: 'analysis', 
            label: 'Diagnostics or Teacher Commentary', 
            isComplete: diagnosticsCount > 0 || commentaryExists, 
            type: 'required',
            link: '/teacher-file' // Commentary is easiest to fill in the File view
        },
        { 
            id: 'evidence', 
            label: 'Moderation Evidence Uploaded', 
            isComplete: evidenceCount > 0, 
            type: 'recommended',
            link: '/evidence-audit'
        }
    ];

    const requiredSteps = steps.filter(s => s.type === 'required');
    const completedRequired = requiredSteps.filter(s => s.isComplete).length;
    const percent = Math.round((completedRequired / requiredSteps.length) * 100);

    return { 
        steps, 
        percent, 
        isReady: percent === 100,
        summary: {
            classes: classes.length,
            learners: learners.length,
            assessments: assessments.length,
            evidence: evidenceCount
        }
    };
  }, [termId, yearId]);

  return { stats, loading: stats === undefined };
};