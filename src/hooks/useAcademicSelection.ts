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

  // 1. Validate Year Selection
  const activeYear = useMemo(() => {
    if (!years.length || !activeYearId) return null;
    const found = years.find(y => y.id === activeYearId);
    
    // If ID exists in storage but not in DB (e.g. was deleted), reset it
    if (!found && years.length > 0) {
        return null;
    }
    return found || null;
  }, [years, activeYearId]);

  // 2. Validate Term Selection
  const activeTerm = useMemo(() => {
    if (!terms.length || !activeTermId) return null;
    const found = terms.find(t => t.id === activeTermId);
    
    // Ensure term belongs to the active year
    if (found && activeYear && found.year_id !== activeYear.id) {
        return null;
    }
    return found || null;
  }, [terms, activeTermId, activeYear]);

  // 3. Auto-recovery and default selection logic
  useEffect(() => {
    // Year Recovery
    if (!activeYear && years.length > 0) {
      const latestYear = years[0]; 
      setActiveYearIdState(latestYear.id);
      localStorage.setItem(STORAGE_KEYS.YEAR, latestYear.id);
    }
    
    // Term Recovery
    if (activeYear && !activeTerm && terms.length > 0) {
      // Find terms for THIS year
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
    
    // Changing year must reset term to prevent cross-year context leaks
    setActiveTermIdState(null);
    localStorage.removeItem(STORAGE_KEYS.TERM);
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