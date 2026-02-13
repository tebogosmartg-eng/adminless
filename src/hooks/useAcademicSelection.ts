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

  // STABILISATION: Ensure we have a year selected, but do NOT auto-jump terms.
  useEffect(() => {
    if (!activeYear && years.length > 0) {
      const openYear = years.find(y => !y.closed) || years[0];
      setActiveYearIdState(openYear.id);
      localStorage.setItem(STORAGE_KEYS.YEAR, openYear.id);
    }
  }, [years, activeYear]);

  const setActiveYear = (year: AcademicYear | null) => {
    const id = year?.id || null;
    setActiveYearIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.YEAR, id);
    else localStorage.removeItem(STORAGE_KEYS.YEAR);
    
    // Reset term when year changes to force explicit selection/load of the new year's start
    setActiveTermIdState(null);
    localStorage.removeItem(STORAGE_KEYS.TERM);
  };

  const setActiveTerm = (term: Term | null) => {
    if (!term) {
        setActiveTermIdState(null);
        localStorage.removeItem(STORAGE_KEYS.TERM);
        return;
    }

    // STRICT PROGRESSION GUARD:
    // User cannot switch to a term if the preceding term in the 1-2-3-4 sequence is not finalised.
    if (activeYear && term.year_id === activeYear.id) {
        const yearTerms = [...terms]
            .filter(t => t.year_id === activeYear.id)
            .sort((a, b) => a.name.localeCompare(b.name));
            
        const targetIndex = yearTerms.findIndex(t => t.id === term.id);
        
        // Verify all terms before the target are 'is_finalised'
        for (let i = 0; i < targetIndex; i++) {
            if (!yearTerms[i].is_finalised) {
                showError(`Term Progression Locked: You must finalise ${yearTerms[i].name} before activating ${term.name}.`);
                return;
            }
        }
    }

    setActiveTermIdState(term.id);
    localStorage.setItem(STORAGE_KEYS.TERM, term.id);
  };

  return { activeYear, activeTerm, setActiveYear, setActiveTerm };
};