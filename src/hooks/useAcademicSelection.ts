"use client";

import { useState, useMemo, useEffect } from 'react';
import { AcademicYear, Term } from '@/lib/types';

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
    return terms.find(t => t.id === activeTermId) || null;
  }, [terms, activeTermId]);

  // Auto-recovery and default selection logic
  useEffect(() => {
    if (!activeYearId && years.length > 0) {
      const latestYear = years[0]; 
      setActiveYearIdState(latestYear.id);
      localStorage.setItem(STORAGE_KEYS.YEAR, latestYear.id);
    }
  }, [years, activeYearId]);

  useEffect(() => {
    if (activeYear && !activeTermId && terms.length > 0) {
      const openTerm = terms.find(t => !t.closed);
      const targetTerm = openTerm || terms[0];
      setActiveTermIdState(targetTerm.id);
      localStorage.setItem(STORAGE_KEYS.TERM, targetTerm.id);
    }
  }, [terms, activeYear, activeTermId]);

  const setActiveYear = (year: AcademicYear | null) => {
    const id = year?.id || null;
    setActiveYearIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.YEAR, id);
    else localStorage.removeItem(STORAGE_KEYS.YEAR);
    
    if (!id) {
        setActiveTermIdState(null);
        localStorage.removeItem(STORAGE_KEYS.TERM);
    }
  };

  const setActiveTerm = (term: Term | null) => {
    const id = term?.id || null;
    setActiveTermIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.TERM, id);
    else localStorage.removeItem(STORAGE_KEYS.TERM);
  };

  return {
    activeYear,
    activeTerm,
    setActiveYear,
    setActiveTerm
  };
};