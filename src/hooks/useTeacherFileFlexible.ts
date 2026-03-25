"use client";

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { TeacherFileTemplate, TeacherFileTemplateSection, TeacherFileEntry, SectionType } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from '@/services/sync';
import { showSuccess, showError } from '@/utils/toast';
import { useCallback } from 'react';

export const useTeacherFileFlexible = (classId: string, termId: string) => {
  
  const template = useLiveQuery(
    () => db.teacherfile_templates.where('[class_id+term_id]').equals([classId, termId]).first(),
    [classId, termId]
  );

  const sections = useLiveQuery(
    async () => {
      if (!template) return [];
      return db.teacherfile_template_sections
        .where('template_id')
        .equals(template.id)
        .sortBy('sort_order');
    },
    [template?.id]
  ) || [];

  const entries = useLiveQuery(
    () => db.teacherfile_entries.where('[class_id+term_id]').equals([classId, termId]).toArray(),
    [classId, termId]
  ) || [];

  const loading = template === undefined;

  const initDefaultTemplate = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const templateId = crypto.randomUUID();
      const newTemplate: TeacherFileTemplate = {
        id: templateId,
        user_id: user.id,
        name: "Default Term Template",
        scope: 'class_term',
        class_id: classId,
        term_id: termId,
        created_at: new Date().toISOString()
      };

      const defaultSections: Omit<TeacherFileTemplateSection, 'id'>[] = [
        { template_id: templateId, title: "Weekly Notes", type: 'notes', sort_order: 1, config: {} },
        { template_id: templateId, title: "Learner Support", type: 'interventions', sort_order: 2, config: {} },
        { template_id: templateId, title: "Evidence Tracking", type: 'attachments', sort_order: 3, config: {} },
        { template_id: templateId, title: "Parent Communication", type: 'observations', sort_order: 4, config: {} },
        { template_id: templateId, title: "Term Targets", type: 'targets', sort_order: 5, config: {} },
        { template_id: templateId, title: "Interventions", type: 'interventions', sort_order: 6, config: {} }
      ];

      await db.transaction('rw', [db.teacherfile_templates, db.teacherfile_template_sections], async () => {
        await db.teacherfile_templates.add(newTemplate);
        await queueAction('teacherfile_templates', 'create', newTemplate);

        const sectionsWithIds = defaultSections.map(s => ({ ...s, id: crypto.randomUUID() }));
        await db.teacherfile_template_sections.bulkAdd(sectionsWithIds as any);
        await queueAction('teacherfile_template_sections', 'create', sectionsWithIds);
      });

      showSuccess("Default template initialized.");
    } catch (e) {
      showError("Failed to initialize template.");
    }
  }, [classId, termId]);

  const addSection = async (title: string, type: SectionType) => {
    if (!template) return;
    const newSection: TeacherFileTemplateSection = {
      id: crypto.randomUUID(),
      template_id: template.id,
      title,
      type,
      config: {},
      sort_order: sections.length + 1
    };
    await db.teacherfile_template_sections.add(newSection);
    await queueAction('teacherfile_template_sections', 'create', newSection);
  };

  const updateSection = async (id: string, updates: Partial<TeacherFileTemplateSection>) => {
    await db.teacherfile_template_sections.update(id, updates);
    await queueAction('teacherfile_template_sections', 'update', { ...updates, id });
  };

  const deleteSection = async (id: string) => {
    await db.teacherfile_template_sections.delete(id);
    await queueAction('teacherfile_template_sections', 'delete', { id });
  };

  const addEntry = async (sectionId: string | null, title: string, content: string, visibility: TeacherFileEntry['visibility'] = 'private', tags: string[] = []) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newEntry: TeacherFileEntry = {
      id: crypto.randomUUID(),
      user_id: user.id,
      class_id: classId,
      term_id: termId,
      section_id: sectionId,
      title,
      content,
      visibility,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.teacherfile_entries.add(newEntry);
    await queueAction('teacherfile_entries', 'create', newEntry);
  };

  const updateEntry = async (id: string, updates: Partial<TeacherFileEntry>) => {
    const payload = { ...updates, id, updated_at: new Date().toISOString() };
    await db.teacherfile_entries.update(id, payload);
    await queueAction('teacherfile_entries', 'update', payload);
  };

  const deleteEntry = async (id: string) => {
    await db.teacherfile_entries.delete(id);
    await queueAction('teacherfile_entries', 'delete', { id });
  };

  return {
    template,
    sections,
    entries,
    loading,
    initDefaultTemplate,
    addSection,
    updateSection,
    deleteSection,
    addEntry,
    updateEntry,
    deleteEntry
  };
};