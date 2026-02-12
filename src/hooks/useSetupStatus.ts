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
  const { savedSubjects, hasProfile } = useSettings();

  const totalAssessments = useLiveQuery(() => db.assessments.count()) || 0;
  const totalMarks = useLiveQuery(() => db.assessment_marks.count()) || 0;
  
  const hasLegacyData = useLiveQuery(async () => {
    const counts = await Promise.all([
        db.classes.filter(c => !c.year_id || !c.term_id).count(),
        db.assessments.filter(a => !a.term_id).count(),
        db.learner_notes.filter(n => !n.term_id).count()
    ]);
    return counts.some(c => c > 0);
  }) || false;

  const status = useMemo(() => {
    // If we are still loading core data, return a state that prevents UI from collapsing
    if (academicLoading || classesLoading) {
        return {
            coreSteps: [],
            missingRequired: [],
            isReadyForFinalization: false,
            isLoading: true,
            hasInitialSetup: false,
            hasMarksCaptured: false,
            hasLegacyData: false,
            hasProfile
        };
    }

    const step1 = !!activeYear;
    const step2 = !!activeTerm;
    const step3 = savedSubjects.length > 0;
    const step4 = classes.length > 0;
    const step5 = classes.length > 0 && classes.every(c => c.learners.length > 0);
    const step6 = totalAssessments > 0;
    const step7 = totalMarks > 0;
    const step8 = classes.length > 0 && totalAssessments > 0 && classes.some(c => totalMarks > 0); 

    const coreSteps = [
        { id: 1, title: 'Select Academic Year', done: step1 },
        { id: 2, title: 'Select Active Term', done: step2 },
        { id: 3, title: 'Confirm Subjects', done: step3 },
        { id: 4, title: 'Create Classes', done: step4 },
        { id: 5, title: 'Verify Roster Names', done: step5 },
        { id: 6, title: 'Create Assessments', done: step6 },
        { id: 7, title: 'Capture Marks', done: step7 },
        { id: 8, title: 'Resolve Weighting Errors', done: step8 }
    ];

    const missingRequired = coreSteps.filter(s => !s.done);
    const isReadyForFinalization = missingRequired.length === 0;

    return {
        coreSteps,
        missingRequired,
        isReadyForFinalization,
        isLoading: false,
        hasInitialSetup: step1 && step2 && step3 && step4,
        hasMarksCaptured: step7,
        hasLegacyData,
        hasProfile
    };
  }, [activeYear, activeTerm, savedSubjects, classes, totalAssessments, totalMarks, hasLegacyData, hasProfile, academicLoading, classesLoading]);

  return status;
};