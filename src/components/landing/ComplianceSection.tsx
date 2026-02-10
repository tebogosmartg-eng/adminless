"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { SendHorizonal, BadgeCheck, FileSearch, Download, CheckCircle2 } from "lucide-react";

const COMPLIANCE_ITEMS = [
  { title: "SA-SAMS Ready", icon: SendHorizonal, desc: "Finalised term marks are exported in formats optimized for easy SA-SAMS entry." },
  { title: "CAPS Aligned", icon: BadgeCheck, desc: "Supports weighting and grading systems required by the national curriculum." },
  { title: "Moderation Support", icon: FileSearch, desc: "Track and upload the required 10% sample for departmental audit." }
];

export const ComplianceSection = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                  <div>
                    <Badge className="bg-blue-600/10 text-blue-600 border-none mb-4 px-3 py-1 uppercase tracking-[0.15em] text-[10px] font-black">National Compliance</Badge>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">Built for the South African academic structure.</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                        We've carefully engineered AdminLess to mirror the requirements of the DBE and provincial departments, making official reporting a breeze.
                    </p>
                  </div>
                  
                  <div className="grid gap-6">
                      {COMPLIANCE_ITEMS.map((item, i) => (
                          <div key={i} className="flex gap-5 group">
                              <div className="mt-1 bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl h-fit text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white duration-300">
                                  <item.icon className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="relative">
                  <div className="absolute -inset-10 bg-blue-600/5 rounded-full blur-[80px] pointer-events-none" />
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(37,99,235,0.1)] overflow-hidden"
                  >
                       <div className="absolute top-0 right-0 p-8 opacity-5">
                            <CheckCircle2 className="w-32 h-32 text-blue-600" />
                       </div>

                       <div className="flex items-center justify-between mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
                           <div className="space-y-1">
                              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Official Export</h4>
                              <p className="font-bold text-xl">Term 3 Final Summaries</p>
                           </div>
                           <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-3 py-1 font-bold">LOCKED & READY</Badge>
                       </div>
                       <div className="space-y-5">
                           {[1, 2, 3].map(i => (
                              <div key={i} className="flex items-center gap-3">
                                 <div className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                                 <div className="h-4 flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-md" />
                                 <div className="h-4 w-12 bg-slate-50 dark:bg-slate-800/50 rounded-md" />
                              </div>
                           ))}
                           <div className="pt-8 mt-4">
                               <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all duration-300 hover:scale-[1.02]">
                                   <Download className="mr-3 h-5 w-5" /> Download SASAMS Record
                               </Button>
                           </div>
                       </div>
                  </motion.div>
              </div>
          </div>
      </div>
    </section>
  );
};