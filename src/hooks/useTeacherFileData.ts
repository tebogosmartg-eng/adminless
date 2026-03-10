"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

export const useTeacherFileData = (yearId: string, termId: string, classId: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!yearId || !termId || !classId) {
          if (isMounted) setLoading(false);
          return;
      }

      setLoading(true);
      try {
        const classInfo = await db.classes.get(classId);
        if (!classInfo) throw new Error("Class not found");

        const allSamples = await db.moderation_samples.toArray();
        const sample = allSamples.find(s => s.class_id === classId && s.term_id === termId);

        const [learners, assessments, marks, evidence, diagnostics, rubrics] = await Promise.all([
            db.learners.where('class_id').equals(classId).toArray(),
            db.assessments.where('[class_id+term_id]').equals([classId, termId]).toArray(),
            db.assessment_marks.toArray(),
            db.evidence.where('class_id').equals(classId).filter(e => e.term_id === termId).toArray(),
            db.diagnostics.toArray(),
            db.rubrics.toArray()
        ]);

        const assessmentIds = new Set(assessments.map(a => a.id));
        const relevantMarks = marks.filter(m => assessmentIds.has(m.assessment_id));
        const relevantDiagnostics = diagnostics.filter(d => assessmentIds.has(d.assessment_id));

        const learnerAvgs = learners.map(l => l.id ? calculateWeightedAverage(assessments, relevantMarks, l.id) : 0).filter(a => a > 0);
        const avg = learnerAvgs.length > 0 ? (learnerAvgs.reduce((a, b) => a + b, 0) / learnerAvgs.length).toFixed(1) : "0.0";
        const passRate = learnerAvgs.length > 0 ? Math.round((learnerAvgs.filter(a => a >= 50).length / learnerAvgs.length) * 100) : 0;

        if (isMounted) {
            setData({
                classInfo: { ...classInfo, learners: learners.sort((a,b) => a.name.localeCompare(b.name)) },
                assessments: assessments.sort((a,b) => (a.date||'').localeCompare(b.date||'')),
                marks: relevantMarks,
                evidence,
                diagnostics: relevantDiagnostics,
                moderationSample: sample || null,
                rubrics,
                stats: { average: avg, passRate }
            });
        }
      } catch (e: any) {
          if (isMounted) setError(e.message);
      } finally {
          if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [yearId, termId, classId]);

  return { data, loading, error };
};