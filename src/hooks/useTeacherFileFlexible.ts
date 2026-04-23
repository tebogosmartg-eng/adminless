"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TeacherFileTemplate,
  TeacherFileTemplateSection,
  TeacherFileEntry,
  SectionType
} from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/utils/toast";

export const useTeacherFileFlexible = (classId: string, termId: string) => {
  const [template, setTemplate] = useState<TeacherFileTemplate | null>(null);
  const [sections, setSections] = useState<TeacherFileTemplateSection[]>([]);
  const [entries, setEntries] = useState<TeacherFileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH ALL
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!classId || !termId) return;

      setLoading(true);

      try {
        // 1. Template
        const { data: templateData } = await supabase
          .from("teacherfile_templates")
          .select("*")
          .eq("class_id", classId)
          .eq("term_id", termId)
          .maybeSingle();

        // 2. Sections
        const { data: sectionsData } = await supabase
          .from("teacherfile_template_sections")
          .select("*")
          .eq("template_id", templateData?.id)
          .order("sort_order", { ascending: true });

        // 3. Entries
        const { data: entriesData } = await supabase
          .from("teacherfile_entries")
          .select("*")
          .eq("class_id", classId)
          .eq("term_id", termId);

        if (isMounted) {
          setTemplate(templateData || null);
          setSections(sectionsData || []);
          setEntries(entriesData || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [classId, termId]);

  // 🔥 INIT TEMPLATE
  const initDefaultTemplate = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: newTemplate } = await supabase
        .from("teacherfile_templates")
        .insert([{
          user_id: user.id,
          name: "Default Term Template",
          scope: "class_term",
          class_id: classId,
          term_id: termId,
        }])
        .select()
        .single();

      const defaultSections = [
        { title: "Weekly Notes", type: "notes" },
        { title: "Learner Support", type: "interventions" },
        { title: "Evidence Tracking", type: "attachments" },
        { title: "Parent Communication", type: "observations" },
        { title: "Term Targets", type: "targets" },
        { title: "Interventions", type: "interventions" }
      ];

      const sectionsPayload = defaultSections.map((s, i) => ({
        template_id: newTemplate.id,
        title: s.title,
        type: s.type,
        sort_order: i + 1,
        config: {}
      }));

      const { data: newSections } = await supabase
        .from("teacherfile_template_sections")
        .insert(sectionsPayload)
        .select();

      setTemplate(newTemplate);
      setSections(newSections || []);

      showSuccess("Default template initialized.");
    } catch (e) {
      console.error(e);
      showError("Failed to initialize template.");
    }
  }, [classId, termId]);

  // 🔥 SECTION CRUD
  const addSection = async (title: string, type: SectionType) => {
    if (!template?.id) return;

    const { data } = await supabase
      .from("teacherfile_template_sections")
      .insert([{
        template_id: template.id,
        title,
        type,
        sort_order: sections.length + 1,
        config: {}
      }])
      .select()
      .single();

    setSections(prev => [...prev, data]);
  };

  const updateSection = async (id: string, updates: Partial<TeacherFileTemplateSection>) => {
    await supabase
      .from("teacherfile_template_sections")
      .update(updates)
      .eq("id", id);

    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const deleteSection = async (id: string) => {
    await supabase
      .from("teacherfile_template_sections")
      .delete()
      .eq("id", id);

    setSections(prev => prev.filter(s => s.id !== id));
  };

  // 🔥 ENTRY CRUD
  const addEntry = async (
    sectionId: string | null,
    title: string,
    content: string,
    visibility: TeacherFileEntry["visibility"] = "private",
    tags: string[] = []
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teacherfile_entries")
      .insert([{
        user_id: user.id,
        class_id: classId,
        term_id: termId,
        section_id: sectionId,
        title,
        content,
        visibility,
        tags,
      }])
      .select()
      .single();

    setEntries(prev => [data, ...prev]);
  };

  const updateEntry = async (id: string, updates: Partial<TeacherFileEntry>) => {
    const payload = { ...updates, updated_at: new Date().toISOString() };

    await supabase
      .from("teacherfile_entries")
      .update(payload)
      .eq("id", id);

    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, ...payload } : e))
    );
  };

  const deleteEntry = async (id: string) => {
    await supabase
      .from("teacherfile_entries")
      .delete()
      .eq("id", id);

    setEntries(prev => prev.filter(e => e.id !== id));
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