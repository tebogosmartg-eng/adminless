"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SendHorizonal, BadgeCheck, FileSearch, Download } from "lucide-react";

const COMPLIANCE_ITEMS = [
  { title: "SA-SAMS Ready", icon: SendHorizonal, desc: "Finalised term marks are exported in formats optimized for easy SA-SAMS entry." },
  { title: "CAPS Aligned", icon: BadgeCheck, desc: "Supports weighting and grading systems required by the national curriculum." },
  { title: "Moderation Support", icon: FileSearch, desc: "Track and upload the required 10% sample for departmental audit." }
];

export const ComplianceSection = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
              <div>
                  <Badge className="bg-blue-600 mb-4 px-3 py-1 uppercase tracking-widest text-[10px]">National Compliance</Badge>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">Built for the South African academic structure.</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                      We've carefully engineered AdminLess to mirror the requirements of the DBE and provincial departments, making official reporting a breeze.
                  </p>
                  
                  <div className="space-y-6">
                      {COMPLIANCE_ITEMS.map((item, i) => (
                          <div key={i} className="flex gap-4">
                              <div className="mt-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg h-fit text-blue-600">
                                  <item.icon className="h-5 w-5" />
                              </div>
                              <div>
                                  <h4 className="font-bold text-sm">{item.title}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 rounded-[2rem] blur-2xl group-hover:opacity-100 transition-opacity opacity-50" />
                  <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl">
                       <div className="flex items-center justify-between mb-8">
                           <div className="space-y-1">
                              <h4 className="font-black text-xs uppercase tracking-[0.15em] text-slate-400">Sample Export</h4>
                              <p className="font-bold text-lg">Term 3 Results</p>
                           </div>
                           <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">FINALIZED</Badge>
                       </div>
                       <div className="space-y-4">
                           {[1, 2, 3].map(i => (
                              <div key={i} className="h-10 w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                           ))}
                           <div className="pt-6 mt-6 border-t border-dashed">
                               <Button className="w-full bg-blue-600 text-white font-bold h-12">
                                   <Download className="mr-2 h-4 w-4" /> Download SASAMS Summary
                               </Button>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      </div>
    </section>
  );
};