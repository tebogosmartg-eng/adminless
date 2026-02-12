"use client";

import { useState, useMemo, useEffect } from 'react';
import { AcademicYear, Term } from '@/lib/types';
import { showError } from '@/utils/toast';

const STORAGE_KEYS = {
  YEAR: 'adminless_active_year_id',
  TERM: 'adminless_active_term_id'
};

export const useAcademicSelection = (years: AcademicYear[], terms: Term[]) => {
  const [activeYearId, setActiveYearIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.YEAR));
  const [activeTermId, setActiveTermIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.TERM));

  const activeYear = useMemo(() => {
    if (!years.length || !activeYearId) return null;
    return years.find(y => y.id === activeYearId) || null;
  }, [years, activeYearId]);

  const activeTerm = useMemo(() => {
    if (!terms.length || !activeTermId) return null;
    const found = terms.find(t => t.id === activeTermId);
    if (found && activeYear && found.year_id !== activeYear.id) return null;
    return found || null;
  }, [terms, activeTermId, activeYear]);

  // Persistent Context Recovery
  useEffect(() => {
    if (!activeYear && years.length > 0) {
      const openYear = years.find(y => !y.closed) || years[0];
      setActiveYearIdState(openYear.id);
      localStorage.setItem(STORAGE_KEYS.YEAR, openYear.id);
    }
    
    if (activeYear && !activeTerm && terms.length > 0) {
      const yearTerms = terms.filter(t => t.year_id === activeYear.id);
      if (yearTerms.length > 0) {
          const openTerm = yearTerms.find(t => !t.closed);
          const targetTerm = openTerm || yearTerms[0];
          setActiveTermIdState(targetTerm.id);
          localStorage.setItem(STORAGE_KEYS.TERM, targetTerm.id);
      }
    }
  }, [years, activeYear, terms, activeTerm]);

  const setActiveYear = (year: AcademicYear | null) => {
    const id = year?.id || null;
    setActiveYearIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.YEAR, id);
    else localStorage.removeItem(STORAGE_KEYS.YEAR);
    
    setActiveTermIdState(null);
    localStorage.removeItem(STORAGE_KEYS.TERM);
  };

  const setActiveTerm = (term: Term | null) => {
    if (!term) {
        setActiveTermIdState(null);
        localStorage.removeItem(STORAGE_KEYS.TERM);
        return;
    }

    // Workflow Guard: Ensure term finalisation before moving forward
    if (activeTerm && !activeTerm.closed && activeYear && term.year_id === activeYear.id) {
        const yearTerms = terms.filter(t => t.year_id === activeYear.id);
        const currentIndex = yearTerms.findIndex(t => t.id === activeTerm.id);
        const targetIndex = yearTerms.findIndex(t => t.id === term.id);

        if (targetIndex > currentIndex) {
            showError(`Workflow Restriction: Finalise ${activeTerm.name} in Settings before activating ${term.name}.`);
            return;
        }
    }

    setActiveTermIdState(term.id);
    localStorage.setItem(STORAGE_KEYS.TERM, term.id);
  };

  return { activeYear, activeTerm, setActiveYear, setActiveTerm };
};