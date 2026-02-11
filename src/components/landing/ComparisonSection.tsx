"use client";

import React from 'react';
import { XCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPARISONS = [
  {
    pain: "Manual weighting calculations (prone to error)",
    relief: "Instant, automatic weighted totals"
  },
  {
    pain: "Re-typing names for every new term",
    relief: "Rosters roll-forward with one click"
  },
  {
    pain: "Searching through emails for script photos",
    relief: "Secure, linked evidence folder per student"
  },
  {
    pain: "Calculating pass rates with formulas",
    relief: "Real-time analytics and pass-rate tracking"
  },
  {
    pain: "Stressful term-end data entry",
    relief: "One-click SA-SAMS aligned exports"
  }
];

export const ComparisonSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">A better way to manage your classes</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Shift from administrative labor to instructional focus.</p>
          </div>

          <div className="grid gap-4">
            <div className="hidden md:grid md:grid-cols-2 gap-8 px-6 mb-2">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">The Old Way</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">The AdminLess Way</div>
            </div>

            {COMPARISONS.map((item, i) => (
              <div 
                key={i} 
                className="group grid md:grid-cols-2 gap-4 md:gap-8 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#fcfcfd] dark:bg-slate-900/80 transition-all hover:border-blue-100 dark:hover:border-blue-900/30"
              >
                <div className="flex items-start gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                  <XCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 line-through decoration-slate-300">{item.pain}</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{item.relief}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
             <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Designed to complement your existing workflow, not complicate it.
             </p>
          </div>
        </div>
      </div>
    </section>
  );
};