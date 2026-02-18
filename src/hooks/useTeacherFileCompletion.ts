"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/db';

export interface CompletionStep {
  id: string;
  label: string;
  isComplete: boolean;
  type: 'required' | 'recommended';
  link: string;
}

export const useTeacherFileCompletion = (termId: string, yearId: string) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const calculateStats = async () => {
      setLoading(true);
      try {
        const classes = await db.classes
            .where('[year_id+term_id]')
            .equals([yearId, termId])
            .toArray();
        
        const classIds = classes.map(c => c.id);
        const learners = await db.learners.where('class_id').anyOf(classIds).toArray();
        const assessments = await db.assessments.where('term_id').equals(termId).filter(a => classIds.includes(a.class_id)).toArray();
        const assessmentIds = assessments.map(a => a.id);
        const marksCount = await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).filter(m => m.score !== null).count();
        const diagCount = await db.diagnostics.filter(d => assessmentIds.includes(d.assessment_id)).count();

        const term = await db.terms.get(termId);
        const sectionKey = `${term?.name.toLowerCase().replace(' ', '') || ''}.commentary`;
        const annotation = await db.teacher_file_annotations
            .where({ academic_year_id: yearId, term_id: termId, section_key: sectionKey })
            .first();
        
        const commentaryExists = !!annotation?.content?.trim();
        const evidenceCount = await db.evidence.where('term_id').equals(termId).count();

        const steps: CompletionStep[] = [
            { id: 'classes', label: 'Active Classes Created', isComplete: classes.length > 0, type: 'required', link: '/classes' },
            { id: 'learners', label: 'Learner Rosters Compiled', isComplete: learners.length > 0, type: 'required', link: '/classes' },
            { id: 'assessments', label: 'Formal Tasks Defined', isComplete: assessments.length > 0, type: 'required', link: '/classes' },
            { id: 'marks', label: 'Marks Captured', isComplete: marksCount > 0, type: 'required', link: '/classes' },
            { id: 'analysis', label: 'Diagnostics or Commentary', isComplete: diagCount > 0 || commentaryExists, type: 'required', link: '/teacher-file' },
            { id: 'evidence', label: 'Moderation Evidence', isComplete: evidenceCount > 0, type: 'recommended', link: '/evidence-audit' }
        ];

        const requiredSteps = steps.filter(s => s.type === 'required');
        const completedRequired = requiredSteps.filter(s => s.isComplete).length;
        const percent = Math.round((completedRequired / requiredSteps.length) * 100);

        if (isMounted.current) {
            setStats({ steps, percent, isReady: percent === 100 });
        }
      } catch (e) {
        console.error("[TeacherFile:Stats] Failed", e);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    calculateStats();
    return () => { isMounted.current = false; };
  }, [termId, yearId]);

  return { stats, loading };
};