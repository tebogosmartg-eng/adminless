"use client";

import { useMemo } from 'react';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

export type StepStatus = 'not-started' | 'in-progress' | 'completed';

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  isLocked: boolean;
  optional?: boolean;
}

export const useSetupStatus = () => {
  const { activeYear, activeTerm, loading: academicLoading } = useAcademic();
  const { classes, loading: classesLoading } = useClasses();
  const { teacherName } = useSettings();

  // Scoped Data Presence Checks - Reactive to activeYear AND activeTerm
  const stats = useLiveQuery(async () => {
    if (!activeYear || !activeTerm) return { learners: 0, assessments: 0, marks: 0, attendance: 0, totalExpectedMarks: 0 };
    
    // Classes are scoped to the active term
    const termClasses = await db.classes.where('term_id').equals(activeTerm.id).toArray();
    const classIds = termClasses.map(c => c.id);
    
    if (classIds.length === 0) return { learners: 0, assessments: 0, marks: 0, attendance: 0, totalExpectedMarks: 0 };

    const learners = await db.learners.where('class_id').anyOf(classIds).toArray();
    const assessments = await db.assessments.where('term_id').equals(activeTerm.id).toArray();
    const assessmentIds = assessments.map(a => a.id);
    
    const marksCount = assessmentIds.length > 0 
        ? await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).filter(m => m.score !== null).count() 
        : 0;
    
    const totalExpected = assessments.length * learners.length;

    return { 
        learners: learners.length, 
        assessments: assessments.length, 
        marks: marksCount,
        totalExpectedMarks: totalExpected
    };
  }, [activeYear?.id, activeTerm?.id]) || { learners: 0, assessments: 0, marks: 0, totalExpectedMarks: 0 };
  
  const weightingReport = useLiveQuery(async () => {
    if (!activeTerm) return { isValid: false, classCount: 0, validWeightCount: 0 };
    
    const termAss = await db.assessments.where('term_id').equals(activeTerm.id).toArray();
    const activeClassesInTerm = classes.filter(c => !c.archived && c.term_id === activeTerm.id);
    
    if (termAss.length === 0) return { isValid: false, classCount: activeClassesInTerm.length, validWeightCount: 0 };

    const classGroups: Record<string, number> = {};
    termAss.forEach(a => {
        classGroups[a.class_id] = (classGroups[a.class_id] || 0) + Number(a.weight);
    });

    const validWeightCount = Object.values(classGroups).filter(w => w === 100).length;
    
    return { 
        isValid: activeClassesInTerm.length > 0 && validWeightCount === activeClassesInTerm.length,
        classCount: activeClassesInTerm.length,
        validWeightCount
    };
  }, [activeTerm?.id, classes]) || { isValid: false, classCount: 0, validWeightCount: 0 };

  const status = useMemo(() => {
    if (academicLoading || classesLoading) {
        return { 
            coreSteps: [] as SetupStep[], 
            progress: 0, 
            isLoading: true,
            isReadyForFinalization: false,
            hasMarksCaptured: false,
            missingRequired: [] as SetupStep[]
        };
    }

    const steps: SetupStep[] = [];

    // 1. Personal Details
    const step1Done = !!teacherName && teacherName.trim() !== "";
    steps.push({
        id: 1,
        title: 'Personal Details',
        description: 'Set up your professional profile to display accurately on your reports.',
        status: step1Done ? 'completed' : 'in-progress',
        isLocked: false
    });

    // 2. Academic Year / Term
    const step2Done = !!activeYear && !!activeTerm;
    steps.push({
        id: 2,
        title: 'Academic Year / Term',
        description: 'This ensures all your records are filed under the correct school cycle.',
        status: step2Done ? 'completed' : (step1Done ? 'in-progress' : 'not-started'),
        isLocked: !step1Done
    });

    // 3. Create Class
    const step3Done = classes.filter(c => c.term_id === activeTerm?.id).length > 0;
    steps.push({
        id: 3,
        title: 'Create Class',
        description: 'Creating classes provides the digital register needed for daily admin.',
        status: step3Done ? 'completed' : (step2Done ? 'in-progress' : 'not-started'),
        isLocked: !step2Done
    });

    // 4. Add Learners
    const step4Done = stats.learners > 0;
    steps.push({
        id: 4,
        title: 'Add Learners',
        description: 'Populate your class rosters for report cards and marksheets.',
        status: step4Done ? 'completed' : (step3Done ? 'in-progress' : 'not-started'),
        isLocked: !step3Done
    });

    // 5. Create Assessment
    const step5Done = stats.assessments > 0;
    steps.push({
        id: 5,
        title: 'Create Assessment',
        description: 'Plan formal tasks to organize marksheets and calculations.',
        status: step5Done ? 'completed' : (step4Done ? 'in-progress' : 'not-started'),
        isLocked: !step4Done
    });

    // 6. Capture Marks
    const marksCaptured = stats.marks > 0;
    const allMarksDone = stats.totalExpectedMarks > 0 && stats.marks >= stats.totalExpectedMarks;
    steps.push({
        id: 6,
        title: 'Capture Marks',
        description: 'Record scores to calculate weighted averages instantly.',
        status: allMarksDone ? 'completed' : (marksCaptured ? 'in-progress' : (step5Done ? 'in-progress' : 'not-started')),
        isLocked: !step5Done
    });

    // 7. Resolve Validation Issues
    const step7Done = weightingReport.isValid && allMarksDone;
    steps.push({
        id: 7,
        title: 'Resolve Validation Issues',
        description: 'Ensure data is accurate and ready for moderation.',
        status: step7Done ? 'completed' : (allMarksDone ? 'in-progress' : 'not-started'),
        isLocked: !allMarksDone
    });

    // 8. Finalise Term
    const step8Done = !!activeTerm?.is_finalised;
    steps.push({
        id: 8,
        title: 'Finalise Term',
        description: 'Lock your work into a professional record safe from changes.',
        status: step8Done ? 'completed' : (step7Done ? 'in-progress' : 'not-started'),
        isLocked: !step7Done
    });

    const completedCount = steps.filter(s => s.status === 'completed' && !s.optional).length;
    const totalRequired = steps.filter(s => !s.optional).length;
    const progress = Math.round((completedCount / totalRequired) * 100);

    return {
        coreSteps: steps,
        progress,
        isLoading: false,
        isReadyForFinalization: step8Done,
        hasMarksCaptured: marksCaptured,
        missingRequired: steps.filter(s => s.status !== 'completed' && !s.optional)
    };
  }, [activeYear, activeTerm, classes, stats, weightingReport, teacherName, academicLoading, classesLoading]);

  return status;
};