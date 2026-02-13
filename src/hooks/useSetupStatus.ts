"use client";

import { useMemo } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export const useSetupStatus = () => {
  const { activeYear, activeTerm, loading: academicLoading } = useAcademic();
  const { classes, loading: classesLoading } = useClasses();
  const { savedSubjects } = useSettings();

  // Scoped Data Presence Checks
  const yearData = useLiveQuery(async () => {
    if (!activeYear) return { learners: 0, assessments: 0, marks: 0, attendance: 0 };
    
    const yearClasses = await db.classes.where('year_id').equals(activeYear.id).toArray();
    const classIds = yearClasses.map(c => c.id);
    
    if (classIds.length === 0) return { learners: 0, assessments: 0, marks: 0, attendance: 0 };

    const learnersCount = await db.learners.where('class_id').anyOf(classIds).count();
    const assessments = await db.assessments.where('class_id').anyOf(classIds).toArray();
    const assessmentIds = assessments.map(a => a.id);
    
    const marksCount = assessmentIds.length > 0 
        ? await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).count() 
        : 0;
    
    return { 
        learners: learnersCount, 
        assessments: assessments.length, 
        marks: marksCount
    };
  }, [activeYear?.id]) || { learners: 0, assessments: 0, marks: 0 };
  
  const weightingReport = useLiveQuery(async () => {
    if (!activeTerm) return { isValid: false };
    
    const termAss = await db.assessments.where('term_id').equals(activeTerm.id).toArray();
    if (termAss.length === 0) return { isValid: false };

    const classGroups: Record<string, number> = {};
    termAss.forEach(a => {
        classGroups[a.class_id] = (classGroups[a.class_id] || 0) + Number(a.weight);
    });

    const invalidCount = Object.values(classGroups).filter(w => w !== 100).length;
    return { isValid: termAss.length > 0 && invalidCount === 0 };
  }, [activeTerm?.id]) || { isValid: false };

  const status = useMemo(() => {
    if (academicLoading || classesLoading) {
        return {
            coreSteps: [],
            missingRequired: [],
            isReadyForFinalization: false,
            hasMarksCaptured: false,
            isLoading: true,
            progress: 0
        };
    }

    const steps = [
        { id: 1, title: 'Select Academic Year', done: !!activeYear },
        { id: 2, title: 'Select Active Term', done: !!activeTerm },
        { id: 3, title: 'Confirm Subjects Taught', done: savedSubjects.length > 0 },
        { id: 4, title: 'Create or Import Classes', done: classes.length > 0 },
        { id: 5, title: 'Review Learner Lists', done: yearData.learners > 0 },
        { id: 6, title: 'Create Assessment Activities', done: yearData.assessments > 0 },
        { id: 7, title: 'Capture Marks', done: yearData.marks > 0 },
        { id: 8, title: 'Resolve Validation Issues', done: weightingReport.isValid && yearData.marks > 0 },
        { id: 9, title: 'Finalise Term', done: !!activeTerm?.is_finalised },
        { id: 10, title: 'Roll Forward (Optional)', done: false, optional: true }
    ];

    const completedCount = steps.filter(s => s.done && !s.optional).length;
    const progress = Math.round((completedCount / (steps.length - 1)) * 100);

    return {
        coreSteps: steps,
        missingRequired: steps.filter(s => !s.done && !s.optional),
        isReadyForFinalization: !!activeTerm?.is_finalised,
        hasMarksCaptured: yearData.marks > 0,
        isLoading: false,
        progress
    };
  }, [activeYear, activeTerm, classes, yearData, weightingReport, savedSubjects, academicLoading, classesLoading]);

  return status;
};