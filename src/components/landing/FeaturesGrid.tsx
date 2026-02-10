"use client";

import React from 'react';
import { CalendarRange, Users, FileCheck, BarChart3, ClipboardList, ShieldCheck, NotebookPen, WifiOff } from "lucide-react";

const FEATURES = [
  { title: "Academic Control", icon: CalendarRange, desc: "Manage multi-year data with strict term-based scoping." },
  { title: "Roster Management", icon: Users, desc: "Simple student lists with CSV import and AI roster scanning." },
  { title: "Aligned Marksheets", icon: FileCheck, desc: "Automatic weighting and totals prepared for official submission." },
  { title: "Class Analytics", icon: BarChart3, desc: "Real-time pass rates and performance trends for every group." },
  { title: "Attendance Registers", icon: ClipboardList, desc: "Daily tracking with automated monthly consolidated logs." },
  { title: "Evidence & Audit", icon: ShieldCheck, desc: "Attach moderation scripts and maintain a secure audit trail." },
  { title: "Personal Timetable", icon: NotebookPen, desc: "Your daily teaching schedule synced with session records." },
  { title: "Offline Sync", icon: WifiOff, desc: "Capture marks anywhere. Data syncs when you reach Wi-Fi." }
];

export const FeaturesGrid = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need, nothing you don't.</h2>
              <p className="text-slate-500 dark:text-slate-400">A professional toolset for modern academic management.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {FEATURES.map((feature, i) => (
                  <div key={i} className="flex flex-col gap-3 p-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                          <feature.icon className="w-5 h-5" />
                      </div>
                      <div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-1">{feature.title}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </section>
  );
};