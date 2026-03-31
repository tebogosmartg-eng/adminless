"use client";

import { useState, useMemo, useCallback } from 'react';
import { useTeacherFileFlexible } from '@/hooks/useTeacherFileFlexible';
import { useReviewSnapshots } from '@/hooks/useReviewSnapshots';
import { useAcademic } from '@/context/AcademicContext';
import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { getSignedFileUrl } from '@/services/storage';
import { showError, showSuccess } from '@/utils/toast';
import { generateReviewPackPDF } from '@/utils/pdfGenerator';
import { TeacherFileEntry, ReviewSnapshot } from '@/lib/types';

export const useReviewState = (classId: string, termId: string) => {
  const { classes } = useClasses();
  const { activeTerm, terms } = useAcademic();
  const { teacherName, schoolName, schoolLogo, contactEmail, contactPhone } = useSettings();
  
  const currentTerm = useMemo(() => terms.find(t => t.id === termId) || activeTerm, [terms, termId, activeTerm]);

  const { sections, entries, loading } = useTeacherFileFlexible(classId, termId);
  const { snapshots, createSnapshot, deleteSnapshot } = useReviewSnapshots(classId, termId);
  
  const [search, setSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [portfolioOnly, setPortfolioOnly] = useState(true);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  
  const [isBuildingSnapshot, setIsBuildingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const currentClass = classes.find(c => c.id === classId);

  // Data Aggregation
  const entryIds = useMemo(() => entries.map(e => e.id), [entries]);
  const allAttachments = useLiveQuery(
    async () => {
      if (entryIds.length === 0) return [];
      return db.teacherfile_entry_attachments.where('entry_id').anyOf(entryIds).toArray();
    },
    [entryIds]
  ) || [];

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (activeSnapshotId) {
        const snap = snapshots.find(s => s.id === activeSnapshotId);
        if (snap) return entries.filter(e => snap.entry_ids.includes(e.id));
    }
    return list.filter(e => {
        const matchesSearch = !search || 
            (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
            (e.content || "").toLowerCase().includes(search.toLowerCase());
        const matchesSection = selectedSectionId === 'all' || e.section_id === selectedSectionId;
        const matchesPortfolio = !portfolioOnly || e.visibility === 'portfolio';
        return matchesSearch && matchesSection && matchesPortfolio;
    });
  }, [entries, search, selectedSectionId, portfolioOnly, activeSnapshotId, snapshots]);

  const groupedBySection = useMemo(() => {
      const groups: Record<string, typeof filteredEntries> = {};
      sections.forEach(s => {
          const sectionEntries = filteredEntries.filter(e => e.section_id === s.id);
          if (sectionEntries.length > 0) groups[s.id] = sectionEntries;
      });
      return groups;
  }, [sections, filteredEntries]);

  const auditStats = useMemo(() => ({
      total: filteredEntries.length,
      attachments: allAttachments.filter(a => filteredEntries.some(e => e.id === a.entry_id)).length,
      moderation: filteredEntries.filter(e => e.visibility === 'moderation').length,
      portfolio: filteredEntries.filter(e => e.visibility === 'portfolio').length
  }), [filteredEntries, allAttachments]);

  // Actions
  const handleExportPDF = async () => {
    if (!currentClass || !currentTerm) return;
    setIsExporting(true);
    try {
        const packName = activeSnapshotId 
            ? snapshots.find(s => s.id === activeSnapshotId)?.name || "Snapshot"
            : "Live Review Pack";
        await generateReviewPackPDF(
            packName,
            { className: currentClass.className, subject: currentClass.subject, grade: currentClass.grade },
            currentTerm.name,
            filteredEntries,
            allAttachments,
            { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone }
        );
        showSuccess("Portfolio pack exported to PDF.");
    } catch (e) {
        showError("PDF Generation failed.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleViewFile = async (path: string, id: string) => {
    setLoadingFileId(id);
    try {
      const url = await getSignedFileUrl(path);
      window.open(url, '_blank', 'noreferrer');
    } catch (e) {
      showError("Failed to open secure link.");
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleSaveSnapshot = async () => {
      if (!snapshotName.trim()) return;
      await createSnapshot(
          snapshotName.trim(), 
          filteredEntries.map(e => e.id), 
          { search, selectedSectionId, portfolioOnly }
      );
      setSnapshotName("");
      setIsBuildingSnapshot(false);
  };

  const toggleSection = (id: string) => {
      const next = new Set(collapsedSections);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCollapsedSections(next);
  };

  return {
    state: {
        loading,
        currentClass,
        activeTerm: currentTerm,
        teacherName,
        search,
        selectedSectionId,
        portfolioOnly,
        activeSnapshotId,
        isBuildingSnapshot,
        snapshotName,
        loadingFileId,
        isExporting,
        collapsedSections,
        sections,
        snapshots,
        filteredEntries,
        groupedBySection,
        auditStats,
        allAttachments
    },
    actions: {
        setSearch,
        setSelectedSectionId,
        setPortfolioOnly,
        setActiveSnapshotId,
        setIsBuildingSnapshot,
        setSnapshotName,
        handleExportPDF,
        handleViewFile,
        handleSaveSnapshot,
        toggleSection,
        deleteSnapshot
    }
  };
};