"use client";

import React from 'react';
import { 
  BookOpen, 
  Calculator, 
  ShieldCheck, 
  BrainCircuit, 
  FileSpreadsheet, 
  Users, 
  CalendarClock, 
  Camera, 
  WifiOff, 
  FileText, 
  BarChart3, 
  Lock,
  ListChecks,
  SlidersHorizontal,
  MessageSquareQuote,
  Sparkles
} from "lucide-react";

const FEATURES = [
  {
    category: "Academic Management",
    items: [
      { title: "Term-Based Scoping", desc: "Strictly compartmentalized data for each term to prevent cross-contamination.", icon: CalendarClock },
      { title: "Class Roster Management", desc: "Flexible learner lists with bulk CSV import and manual overrides.", icon: Users },
      { title: "Curriculum Planning", desc: "Define and track topic coverage with the integrated Curriculum Planner.", icon: BookOpen },
      { title: "Timetable Integration", desc: "Daily agenda management linked to lesson logs and attendance.", icon: CalendarClock }
    ]
  },
  {
    category: "Marking & Assessment",
    items: [
      { title: "Smart Mark Entry", desc: "Auto-calculate percentages from fractions (e.g., 15/20) and rapid sequential entry.", icon: Calculator },
      { title: "Rubric-Based Marking", desc: "Qualitative marking grids for projects, presentations, and practicals.", icon: FileSpreadsheet },
      { title: "Question-Level Analysis", desc: "Granular breakdown of marks per question for deep diagnostic insights.", icon: ListChecks },
      { title: "Moderation Adjustments", desc: "Apply global percentage adjustments for departmental moderation.", icon: SlidersHorizontal }
    ]
  },
  {
    category: "AI & Automation",
    items: [
      { title: "Script Scanning", desc: "Extract marks from handwritten scripts using AI-powered camera analysis.", icon: Camera },
      { title: "Diagnostic Insights", desc: "AI-generated performance summaries identifying class-wide barriers.", icon: BrainCircuit },
      { title: "Auto-Comment Generation", desc: "Draft personalized report card comments based on learner performance.", icon: MessageSquareQuote },
      { title: "Remediation Worksheets", desc: "AI-drafted intervention material based on diagnostic findings.", icon: Sparkles }
    ]
  },
  {
    category: "Compliance & Audit",
    items: [
      { title: "SA-SAMS Ready", desc: "Export data in formats optimized for official departmental systems.", icon: FileText },
      { title: "Moderation Audit Trail", desc: "Secure evidence folders and moderation sample tracking.", icon: ShieldCheck },
      { title: "Term Finalisation", desc: "Immutable locking of records to ensure audit-ready data integrity.", icon: Lock },
      { title: "Offline-First Sync", desc: "Capture data anywhere; syncs automatically when back online.", icon: WifiOff }
    ]
  }
];

export const FeatureList = () => {
  return (
    <div className="grid md:grid-cols-2 gap-12 py-12">
      {FEATURES.map((cat) => (
        <div key={cat.category} className="space-y-6">
          <h3 className="text-xl font-black text-blue-600 uppercase tracking-widest">{cat.category}</h3>
          <div className="grid gap-6">
            {cat.items.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1 p-2 h-fit rounded-lg bg-slate-100 dark:bg-slate-800">
                  <item.icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};