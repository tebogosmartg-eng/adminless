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
    // Strict Scope: Only allow term if it belongs to the active year
    if (found && activeYear && found.year_id !== activeYear.id) return null;
    return found || null;
  }, [terms, activeTermId, activeYear]);

  /**
   * STABILISATION: Context Restoration
   * Finds the active year and the FIRST non-finalised term.
   */
  useEffect(() => {
    if (years.length > 0 && !activeYear) {
      const openYear = years.find(y => !y.closed) || years[0];
      setActiveYearIdState(openYear.id);
      localStorage.setItem(STORAGE_KEYS.YEAR, openYear.id);
    }
  }, [years, activeYear]);

  useEffect(() => {
    // If we have a year but no term, or the current term is finalised,
    // we should only default to the earliest available non-finalised term.
    if (activeYear && terms.length > 0 && !activeTerm) {
      const yearTerms = terms
        .filter(t => t.year_id === activeYear.id)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      // Rule: Default to the first non-finalised term
      const firstOpenTerm = yearTerms.find(t => !t.is_finalised);
      
      // If all are finalised, pick the last one, otherwise pick the first open one
      const targetTerm = firstOpenTerm || yearTerms[yearTerms.length - 1];
      
      if (targetTerm) {
        setActiveTermIdState(targetTerm.id);
        localStorage.setItem(STORAGE_KEYS.TERM, targetTerm.id);
      }
    }
  }, [activeYear, terms, activeTerm]);

  const setActiveYear = (year: AcademicYear | null) => {
    const id = year?.id || null;
    setActiveYearIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.YEAR, id);
    else localStorage.removeItem(STORAGE_KEYS.YEAR);
    
    // Clear term to let the auto-selector pick the correct starting term for the new year
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
    // Check if all terms preceding the target are finalised
    if (activeYear && term.year_id === activeYear.id) {
        const yearTerms = [...terms]
            .filter(t => t.year_id === activeYear.id)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            
        const targetIndex = yearTerms.findIndex(t => t.id === term.id);
        
        for (let i = 0; i < targetIndex; i++) {
            if (!yearTerms[i].is_finalised) {
                showError(`Locked: Finalise ${yearTerms[i].name} to unlock ${term.name}.`);
                return;
            }
        }
    }

    setActiveTermIdState(term.id);
    localStorage.setItem(STORAGE_KEYS.TERM, term.id);
  };

  return { activeYear, activeTerm, setActiveYear, setActiveTerm };
};