"use client";

import React from 'react';
import { FileCheck, UserCheck, Target, WifiOff, Download } from "lucide-react";

const ALIGNMENTS = [
  { title: "Familiar SA-SAMS-aligned formats", icon: FileCheck, desc: "Export data that matches the forms you already use." },
  { title: "Teacher-controlled finalisation", icon: UserCheck, desc: "You decide when the term is done and the marks are locked." },
  { title: "Class-level focus (no misleading averages)", icon: Target, desc: "See clear, granular data for each learner and class." },
  { title: "Offline-friendly", icon: WifiOff, desc: "Capture attendance and marks without needing constant Wi-Fi." },
  { title: "Audit-ready exports", icon: Download, desc: "Generate professional registers and moderation files instantly." }
];

export const AlignmentSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
                  AdminLess works with how schools already operate.
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-x-16 gap-y-10">
                  {ALIGNMENTS.map((bullet, i) => (
                      <div key={i} className="flex gap-5">
                          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                              <bullet.icon className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="space-y-1">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100">{bullet.title}</h4>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{bullet.desc}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </section>
  );
};