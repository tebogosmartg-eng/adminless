"use client";

import React from 'react';
import { Clock, Calculator, AlertCircle, FileText, Layers } from "lucide-react";

const PROBLEMS = [
  {
      title: "Time lost rewriting marks",
      desc: "Stop copying the same names and scores between marksheets, registers, and official systems.",
      icon: Clock
  },
  {
      title: "Manual calculations",
      desc: "No more calculators. Weighting, totals, and percentages are handled automatically and accurately.",
      icon: Calculator
  },
  {
      title: "Fear of making mistakes",
      desc: "Manual entry leads to errors. Our validation checks ensure your data is consistent before you export.",
      icon: AlertCircle
  },
  {
      title: "Unfamiliar reporting formats",
      desc: "We align your data with standard South African school formats so you don't have to guess.",
      icon: FileText
  },
  {
      title: "Admin overload",
      desc: "Term-end shouldn't be a crisis. Manage your workload day-by-day with simple, reliable tools.",
      icon: Layers
  }
];

export const ProblemSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">Teaching shouldn’t feel like paperwork.</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                  We know that educators are currently burdened by increasing administrative requirements that take time away from the classroom.
              </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {PROBLEMS.map((item, i) => (
                  <div 
                    key={i} 
                    className="p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#fcfcfd] dark:bg-slate-900/80 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 hover:border-blue-200/50 dark:hover:border-blue-900/30 group"
                  >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                          <item.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <h4 className="font-bold text-lg mb-3 text-slate-900 dark:text-slate-100">{item.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
              ))}
          </div>

          <div className="text-center">
              <p className="text-lg font-bold text-slate-400 dark:text-slate-500 italic tracking-tight">
                  &ldquo;AdminLess exists to reduce admin — not add another system.&rdquo;
              </p>
          </div>
      </div>
    </section>
  );
};