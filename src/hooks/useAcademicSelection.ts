"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { AcademicYear, Term } from '@/lib/types';
import { showError } from '@/utils/toast';

const STORAGE_KEYS = {
  YEAR: 'adminless_active_year_id',
  TERM: 'adminless_active_term_id'
};

export const useAcademicSelection = (years: AcademicYear[], terms: Term[]) => {
  const [activeYearId, setActiveYearIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.YEAR));
  const [activeTermId, setActiveTermIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.TERM));
  
  const hasRestored = useRef(false);

  // Validate that stored IDs actually exist in the loaded dataset
  useEffect(() => {
    if (years.length > 0 && activeYearId) {
      const exists = years.some(y => y.id === activeYearId);
      if (!exists) {
        console.warn("[Context] Stored Year ID is invalid. Resetting...");
        setActiveYearIdState(null);
        localStorage.removeItem(STORAGE_KEYS.YEAR);
        setActiveTermIdState(null);
        localStorage.removeItem(STORAGE_KEYS.TERM);
      }
    }
  }, [years, activeYearId]);

  const activeYear = useMemo(() => {
    if (!years || years.length === 0 || !activeYearId) return null;
    return years.find(y => y.id === activeYearId) || null;
  }, [years, activeYearId]);

  const activeTerm = useMemo(() => {
    if (!terms || terms.length === 0 || !activeTermId) return null;
    const found = terms.find(t => t.id === activeTermId);
    
    // Safety: Ensure term belongs to the active year
    if (found && activeYear && found.year_id !== activeYear.id) return null;
    return found || null;
  }, [terms, activeTermId, activeYear]);

  // Auto-selection only if storage is empty
  useEffect(() => {
    if (years.length > 0 && !activeYearId && !hasRestored.current) {
      const openYear = years.find(y => !y.closed) || years[0];
      setActiveYearIdState(openYear.id);
      localStorage.setItem(STORAGE_KEYS.YEAR, openYear.id);
    }
  }, [years, activeYearId]);

  useEffect(() => {
    if (activeYear && terms.length > 0 && !activeTermId && !hasRestored.current) {
      const yearTerms = terms
        .filter(t => t.year_id === activeYear.id)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      const firstOpenTerm = yearTerms.find(t => !t.is_finalised);
      const targetTerm = firstOpenTerm || yearTerms[yearTerms.length - 1];
      
      if (targetTerm) {
        setActiveTermIdState(targetTerm.id);
        localStorage.setItem(STORAGE_KEYS.TERM, targetTerm.id);
        hasRestored.current = true;
      }
    }
  }, [activeYear, terms, activeTermId]);

  const setActiveYear = (year: AcademicYear | null) => {
    const id = year?.id || null;
    if (id === activeYearId) return;

    setActiveYearIdState(id);
    if (id) localStorage.setItem(STORAGE_KEYS.YEAR, id);
    else localStorage.removeItem(STORAGE_KEYS.YEAR);
    
    setActiveTermIdState(null);
    localStorage.removeItem(STORAGE_KEYS.TERM);
    hasRestored.current = false;
  };

  const setActiveTerm = (term: Term | null) => {
    const id = term?.id || null;
    if (id === activeTermId) return;

    if (!term) {
        setActiveTermIdState(null);
        localStorage.removeItem(STORAGE_KEYS.TERM);
        return;
    }

    // Progression Guard
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

    setActiveTermIdState(id);
    localStorage.setItem(STORAGE_KEYS.TERM, id);
  };

  return { activeYear, activeTerm, setActiveYear, setActiveTerm };
};