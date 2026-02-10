"use client";

import React from 'react';
import { GraduationCap, UserCheck, Building2, Globe } from "lucide-react";

const AUDIENCES = [
  { label: "Primary & secondary teachers", icon: GraduationCap },
  { label: "HODs & Grade Heads", icon: UserCheck },
  { label: "School administrators", icon: Building2 },
  { label: "Public & independent schools", icon: Globe }
];

export const AudienceSection = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-center">
                  Built for South African schools
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-center text-lg mb-12 max-w-2xl mx-auto">
                  A platform designed to meet the unique administrative needs of our local education system.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                  {AUDIENCES.map((item, i) => (
                      <div key={i} className="flex flex-col items-center text-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                              <item.icon className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-bold leading-tight">{item.label}</span>
                      </div>
                  ))}
              </div>

              <div className="bg-blue-600 rounded-2xl p-8 text-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
                  <p className="text-xl md:text-2xl font-bold leading-tight">
                      "AdminLess supports existing processes — it doesn’t disrupt them."
                  </p>
              </div>
          </div>
      </div>
    </section>
  );
};