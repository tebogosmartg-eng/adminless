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
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-20 text-center">
              How AdminLess fits into your term
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-y-16 gap-x-8">
              {STEPS.map((step, i) => (
                  <div key={i} className="relative flex flex-col items-center text-center group cursor-default">
                      {i < 4 && (
                          <div className="hidden lg:block absolute top-6 left-[60%] w-full h-[2px] border-t border-dashed border-slate-200 dark:border-slate-800 -z-0" />
                      )}
                      
                      <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg mb-6 relative z-10 shadow-xl shadow-blue-200/50 dark:shadow-none transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                          {i + 1}
                      </div>

                      <div className="space-y-3 px-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-1 text-slate-400 dark:text-slate-500 transition-colors group-hover:text-blue-600 duration-300">
                              <step.icon className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-sm leading-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{step.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium uppercase tracking-tighter">{step.desc}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </section>
  );
};