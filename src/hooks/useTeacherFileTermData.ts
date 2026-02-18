"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useTeacherFileTermData = (termId: string, yearId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`[TeacherFile] Loading records for Term: ${termId}`);
        
        // 1. Resolve Classes
        const classes = await db.classes
            .where('[year_id+term_id]')
            .equals([yearId, termId])
            .toArray();
        
        if (!isMounted.current) return;
        if (classes.length === 0) {
            setData({ empty: true });
            setLoading(false);
            return;
        }

        const classIds = classes.map(c => c.id);

        // 2. Parallel Data Resolution
        const [learners, assessments, marks, evidence, diagnostics] = await Promise.all([
            db.learners.where('class_id').anyOf(classIds).toArray(),
            db.assessments.where('term_id').equals(termId).filter(a => classIds.includes(a.class_id)).toArray(),
            db.assessment_marks.toArray(), // Scoped below
            db.evidence.where('term_id').equals(termId).filter(e => classIds.includes(e.class_id)).toArray(),
            db.diagnostics.toArray() // Scoped below
        ]);

        if (!isMounted.current) return;

        const assessmentIds = new Set(assessments.map(a => a.id));
        const relevantMarks = marks.filter(m => assessmentIds.has(m.assessment_id));
        const relevantDiagnostics = diagnostics.filter(d => assessmentIds.has(d.assessment_id));

        // 3. Analytics Compilation
        const classAnalytics = classes.map(cls => {
            const clsAss = assessments.filter(a => a.class_id === cls.id);
            const clsLearners = learners.filter(l => l.class_id === cls.id);
            const clsMarks = relevantMarks.filter(m => clsAss.some(a => a.id === m.assessment_id));

            const learnerAvgs = clsLearners.map(l => {
                if (!l.id) return 0;
                return calculateWeightedAverage(clsAss, clsMarks, l.id);
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
                assessmentCount: clsAss.length,
                evidenceCount: evidence.filter(e => e.class_id === cls.id).length
            };
        });

        setData({
            empty: false,
            classes: classAnalytics,
            assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
            diagnostics: relevantDiagnostics,
            totalEvidence: evidence.length,
            totalLearners: learners.length
        });
      } catch (err: any) {
        console.error("[TeacherFile:Error] Data compilation failed:", err);
        if (isMounted.current) setError(err.message || "Failed to compile term data.");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchData();

    return () => {
        isMounted.current = false;
    };
  }, [termId, yearId]);

  return { data, loading, error };
};