import { useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { ClassInfo } from '@/lib/types';

export const useDashboardData = () => {
  const { classes } = useClasses();
  
  // Only show active classes on the dashboard
  const activeClasses = useMemo(() => classes.filter(c => !c.archived), [classes]);
  
  // Aggregate all learners for global distribution charts
  const allActiveLearners = useMemo(() => activeClasses.flatMap(c => c.learners), [activeClasses]);

  // Group active classes by subject for categorical analysis
  const classesBySubject = useMemo(() => {
    const groups: Record<string, ClassInfo[]> = {};
    activeClasses.forEach(c => {
      if (!groups[c.subject]) groups[c.subject] = [];
      groups[c.subject].push(c);
    });
    return groups;
  }, [activeClasses]);

  // Group active classes by grade
  const classesByGrade = useMemo(() => {
    const groups: Record<string, ClassInfo[]> = {};
    activeClasses.forEach(c => {
      if (!groups[c.grade]) groups[c.grade] = [];
      groups[c.grade].push(c);
    });
    return groups;
  }, [activeClasses]);

  return {
    classes,
    activeClasses,
    allActiveLearners,
    classesBySubject,
    classesByGrade
  };
};