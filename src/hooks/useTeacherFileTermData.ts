"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useAcademic } from '@/context/AcademicContext';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useTeacherFileTermData = (termId: string, yearId: string) => {
  const data = useLiveQuery(async () => {
    // 1. Resolve Classes for this term/year
    const classes = await db.classes
        .where('[year_id+term_id]')
        .equals([yearId, termId])
        .toArray();
    
    if (classes.length === 0) return { empty: true };

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
        .toArray();

    // 5. Resolve Evidence
    const evidence = await db.evidence
        .where('term_id')
        .equals(termId)
        .filter(e => classIds.includes(e.class_id))
        .toArray();

    // 6. Resolve AI Diagnostics
    const diagnostics = await db.diagnostics
        .where('user_id')
        .equals(classes[0].user_id || '')
        .filter(d => assessmentIds.includes(d.assessment_id))
        .toArray();

    // 7. Calculate Analytics per class
    const classAnalytics = classes.map(cls => {
        const clsAssessments = assessments.filter(a => a.class_id === cls.id);
        const clsLearners = learners.filter(l => l.class_id === cls.id);
        const clsMarks = marks.filter(m => clsAssessments.some(a => a.id === m.assessment_id));

        const learnerAvgs = clsLearners.map(l => {
            if (!l.id) return 0;
            return calculateWeightedAverage(clsAssessments, clsMarks, l.id);
        }).filter(avg => avg > 0);

        const avg = learnerAvgs.length > 0 
            ? learnerAvgs.reduce((a, b) => a + b, 0) / learnerAvgs.length 
            : 0;
        
        const passRate = learnerAvgs.length > 0
            ? (learnerAvgs.filter(a => a >= 50).length / learnerAvgs.length) * 100
            : 0;

        return {
            id: cls.id,
            name: cls.className,
            subject: cls.subject,
            grade: cls.grade,
            average: avg.toFixed(1),
            passRate: Math.round(passRate),
            learnerCount: clsLearners.length,
            assessmentCount: clsAssessments.length,
            evidenceCount: evidence.filter(e => e.class_id === cls.id).length
        };
    });

    return {
        empty: false,
        classes: classAnalytics,
        assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
        diagnostics,
        totalEvidence: evidence.length,
        totalLearners: learners.length
    };
  }, [termId, yearId]);

  return { data, loading: data === undefined };
};