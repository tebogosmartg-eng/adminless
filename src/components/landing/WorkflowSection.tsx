"use client";

import React from 'react';
import { CalendarRange, ClipboardList, Smartphone, FileText, SendHorizonal } from "lucide-react";

const STEPS = [
  { title: "Set academic year & term", icon: CalendarRange, desc: "Start with a clean context for your year." },
  { title: "Create classes & tasks", icon: ClipboardList, desc: "Set up your rosters and assessment titles." },
  { title: "Capture marks safely", icon: Smartphone, desc: "Fast entry with auto-calculated totals." },
  { title: "Export familiar marksheets", icon: FileText, desc: "Generate PDFs in your school's format." },
  { title: "Submit with confidence", icon: SendHorizonal, desc: "Finalise your term and upload to SA-SAMS." }
];

export const WorkflowSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16 text-center">
              How AdminLess fits into your term
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {STEPS.map((step, i) => (
                  <div key={i} className="relative flex flex-col items-center text-center group">
                      {i < 4 && (
                          <div className="hidden lg:block absolute top-6 left-1/2 w-full h-px border-t-2 border-dashed border-slate-200 dark:border-slate-800 -z-0" />
                      )}
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-4 relative z-10 shadow-lg shadow-blue-200 dark:shadow-none group-hover:scale-110 transition-transform">
                          {i + 1}
                      </div>
                      <div className="space-y-2">
                          <h4 className="font-bold text-sm leading-tight px-4">{step.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">{step.desc}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </section>
  );
};