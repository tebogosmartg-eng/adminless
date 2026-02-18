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
        // 1. Data-Driven Section Audits
        const classes = await db.classes
            .where('[year_id+term_id]')
            .equals([yearId, termId])
            .toArray();
        
        const classIds = classes.map(c => c.id);
        const assessments = await db.assessments.where('term_id').equals(termId).filter(a => classIds.includes(a.class_id)).toArray();
        const assessmentIds = assessments.map(a => a.id);
        const marksCount = await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).filter(m => m.score !== null).count();

        // 2. Manual Content Audits (Annotations & Attachments)
        const annotations = await db.teacher_file_annotations
            .where('academic_year_id').equals(yearId)
            .toArray();
        
        const attachments = await db.teacher_file_attachments
            .where('academic_year_id').equals(yearId)
            .toArray();

        const checkSection = (key: string) => {
            const hasComment = annotations.some(a => a.section_key.startsWith(key) && a.content.trim() && (a.term_id === termId || !a.term_id));
            const hasFiles = attachments.some(a => a.section_key === key && (a.term_id === termId || !a.term_id));
            return hasComment || hasFiles;
        };

        const steps: CompletionStep[] = [
            { id: '1', label: '1. Personal Details', isComplete: true, type: 'required', link: '/settings' },
            { id: '2', label: '2. Timetable & Routine', isComplete: true, type: 'required', link: '/settings' },
            { id: '3', label: '3. Subject Policy', isComplete: checkSection('subject_policy'), type: 'required', link: '/teacher-file' },
            { id: '4', label: '4. Curriculum Planning (ATP)', isComplete: checkSection('atp') || checkSection('planning'), type: 'required', link: '/teacher-file' },
            { id: '5', label: '5. Assessments & POA', isComplete: assessments.length > 0 && marksCount > 0, type: 'required', link: '/classes' },
            { id: '6', label: '6. Educator Reports', isComplete: checkSection('educator_reports'), type: 'recommended', link: '/teacher-file' },
            { id: '7', label: '7. LTSM Records', isComplete: checkSection('textbook_records'), type: 'recommended', link: '/teacher-file' },
            { id: '8', label: '8. Meeting Minutes', isComplete: checkSection('meeting_minutes'), type: 'required', link: '/teacher-file' },
            { id: '9', label: '9. IQMS Documents', isComplete: checkSection('iqms'), type: 'required', link: '/teacher-file' },
            { id: '10', label: '10. Correspondence', isComplete: checkSection('correspondence'), type: 'recommended', link: '/teacher-file' }
        ];

        const requiredSteps = steps.filter(s => s.type === 'required');
        const completedRequired = requiredSteps.filter(s => s.isComplete).length;
        const percent = Math.round((completedRequired / requiredSteps.length) * 100);

        if (isMounted.current) {
            setStats({ 
                steps, 
                percent, 
                isReady: percent === 100,
                counts: {
                    attachments: attachments.length,
                    classes: classes.length,
                    assessments: assessments.length
                }
            });
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