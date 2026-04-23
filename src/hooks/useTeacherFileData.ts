"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/db';
import { calculateWeightedAverage } from '@/utils/calculations';

const TEACHER_FILE_CACHE_TTL_MS = 5 * 60 * 1000;
type TeacherFileCacheEntry = { data: any; loadedAt: number };
const teacherFileCache = new Map<string, TeacherFileCacheEntry>();
const teacherFileInFlight = new Map<string, Promise<void>>();
const teacherFileRequestIds = new Map<string, number>();

export const useTeacherFileData = (yearId: string, termId: string, classId: string) => {
  const cacheKey = `${yearId}::${termId}::${classId}`;
  const getCached = () => {
    const cached = teacherFileCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() - cached.loadedAt > TEACHER_FILE_CACHE_TTL_MS) return null;
    return cached.data;
  };
  const initialCached = getCached();
  const [data, setData] = useState<any>(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshingRef = useRef(false);
  const dataRef = useRef<any>(initialCached);
  dataRef.current = data;

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async (silent: boolean) => {
      if (!yearId || !termId || !classId) {
          if (isMounted) setLoading(false);
          return;
      }

      if (refreshingRef.current) {
        const inFlight = teacherFileInFlight.get(cacheKey);
        if (inFlight) await inFlight;
        return;
      }

      const existingRequest = teacherFileInFlight.get(cacheKey);
      if (existingRequest) {
        await existingRequest;
        return;
      }

      refreshingRef.current = true;
      const requestId = (teacherFileRequestIds.get(cacheKey) || 0) + 1;
      teacherFileRequestIds.set(cacheKey, requestId);

      if (isMounted) {
        if (silent) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
      }

      const run = (async () => {
        try {
          const classInfo = await db.classes.get(classId);
          if (!classInfo) throw new Error("Class not found");

          const allSamples = await db.moderation_samples.toArray();
          const sample = allSamples.find(s => s.class_id === classId && s.term_id === termId);

          const [learners, assessments, marks, evidence, diagnostics, rubrics] = await Promise.all([
              db.learners.where('class_id').equals(classId).toArray(),
              db.assessments.where('[class_id+term_id]').equals([classId, termId]).toArray(),
              db.assessment_marks.toArray(),
              db.evidence.where('class_id').equals(classId).filter(e => e.term_id === termId).toArray(),
              db.diagnostics.toArray(),
              db.rubrics.toArray()
          ]);

          // Flexible Portfolio Data
          const template = await db.teacherfile_templates.where('[class_id+term_id]').equals([classId, termId]).first();
          let flexSections: any[] = [];
          let flexEntries: any[] = [];
          let flexAttachments: any[] = [];

          if (template) {
              flexSections = await db.teacherfile_template_sections.where('template_id').equals(template.id).sortBy('sort_order');
              flexEntries = await db.teacherfile_entries.where('[class_id+term_id]').equals([classId, termId]).toArray();
              const entryIds = flexEntries.map(e => e.id);
              if (entryIds.length > 0) {
                  flexAttachments = await db.teacherfile_entry_attachments.where('entry_id').anyOf(entryIds).toArray();
              }
            }

          const assessmentIds = new Set(assessments.map(a => a.id));
          const relevantMarks = marks.filter(m => assessmentIds.has(m.assessment_id));
          const relevantDiagnostics = diagnostics.filter(d => assessmentIds.has(d.assessment_id));

          const learnerAvgs = learners.map(l => l.id ? calculateWeightedAverage(assessments, relevantMarks, l.id) : 0).filter(a => a > 0);
          const avg = learnerAvgs.length > 0 ? (learnerAvgs.reduce((a, b) => a + b, 0) / learnerAvgs.length).toFixed(1) : "0.0";
          const passRate = learnerAvgs.length > 0 ? Math.round((learnerAvgs.filter(a => a >= 50).length / learnerAvgs.length) * 100) : 0;

          const nextData = {
              classInfo: { ...classInfo, learners: learners.sort((a,b) => a.name.localeCompare(b.name)) },
              assessments: assessments.sort((a,b) => (a.date||'').localeCompare(b.date||'')),
              marks: relevantMarks,
              evidence,
              diagnostics: relevantDiagnostics,
              moderationSample: sample || null,
              rubrics,
              stats: { average: avg, passRate },
              flexSections,
              // Only show entries that are marked for portfolio or moderation visibility
              flexEntries: flexEntries.filter(e => e.visibility !== 'private'),
              flexAttachments
          };

          teacherFileCache.set(cacheKey, { data: nextData, loadedAt: Date.now() });
          if (isMounted && teacherFileRequestIds.get(cacheKey) === requestId) {
              setData(nextData);
              setError(null);
          }
        } catch (e: any) {
            if (!isMounted) return;
            const hasExistingData = !!dataRef.current || !!getCached();
            if (!silent && !hasExistingData) {
              setError(e.message);
            }
        } finally {
            if (isMounted) {
              setLoading(false);
              setIsRefreshing(false);
            }
            if (teacherFileRequestIds.get(cacheKey) === requestId) {
              refreshingRef.current = false;
            }
        }
      })();

      teacherFileInFlight.set(cacheKey, run);
      try {
        await run;
      } finally {
        teacherFileInFlight.delete(cacheKey);
      }
    };

    const cached = getCached();
    if (cached && isMounted) {
      setData(cached);
      setLoading(false);
      setError(null);
      void fetchData(true);
    } else {
      void fetchData(false);
    }

    return () => { isMounted = false; };
  }, [yearId, termId, classId, cacheKey]);

  return { data, loading, isRefreshing, refreshing: isRefreshing, error };
};