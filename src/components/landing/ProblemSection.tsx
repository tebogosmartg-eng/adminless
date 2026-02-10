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
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Teaching shouldn’t feel like paperwork.</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                  We know that educators are currently burdened by increasing administrative requirements that take time away from the classroom.
              </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {PROBLEMS.map((item, i) => (
                  <div key={i} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#fcfcfd] dark:bg-slate-900 transition-all hover:border-blue-100 dark:hover:border-blue-900/50 group">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                          <item.icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="font-bold mb-2">{item.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
              ))}
          </div>

          <div className="text-center">
              <p className="text-lg font-semibold text-slate-500 dark:text-slate-400 italic">
                  "AdminLess exists to reduce admin — not add another system."
              </p>
          </div>
      </div>
    </section>
  );
};