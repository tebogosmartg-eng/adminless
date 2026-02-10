"use client";

import React from 'react';
import { EyeOff, DollarSign, Send, Sparkles, ChevronRight } from "lucide-react";
import { DataCommitmentDialog } from './LandingActions';

const POINTS = [
  { title: "No hidden automation", icon: EyeOff, desc: "We never run scripts or processes behind your back." },
  { title: "No data selling", icon: DollarSign, desc: "Your school data is never shared with third-party advertisers." },
  { title: "No auto-submissions", icon: Send, desc: "Data is only exported when you physically click 'Export'." },
  { title: "Ethical AI", icon: Sparkles, desc: "AI is assistive, optional, and always editable by the teacher." }
];

export const DataPrivacySection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">Your data stays yours</h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                  {POINTS.map((point, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              <point.icon className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-sm">{point.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">{point.desc}</p>
                      </div>
                  ))}
              </div>

              <DataCommitmentDialog>
                <button className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-2 py-1">
                    Read our Data & AI Commitment
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </DataCommitmentDialog>
          </div>
      </div>
    </section>
  );
};