"use client";

import React from 'react';
import { Clock, CheckCircle2, Mic, FileText, Coffee, Home } from "lucide-react";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const EVENTS = [
  {
    time: "08:00 AM",
    title: "Morning Register",
    desc: "Mark attendance for 30 learners in under a minute using the mobile-optimized grid.",
    icon: Clock,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    time: "10:30 AM",
    title: "Hands-Free Marking",
    desc: "Dictate quiz marks using Voice Entry while sorting through scripts. No more manual typing.",
    icon: Mic,
    color: "text-purple-600",
    bg: "bg-purple-50"
  },
  {
    time: "01:15 PM",
    title: "Automatic Weighting",
    desc: "The term project is done. AdminLess calculates the final weighted percentage instantly.",
    icon: FileText,
    color: "text-green-600",
    bg: "bg-green-50"
  },
  {
    time: "03:00 PM",
    title: "Familiar Exports",
    desc: "Download your marksheet as an official PDF. It's already in your school's required format.",
    icon: CheckCircle2,
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  {
    time: "04:30 PM",
    title: "Reclaim Your Evening",
    desc: "Sync your data to the cloud and head home. No marking backlog to finish on the couch.",
    icon: Home,
    color: "text-indigo-600",
    bg: "bg-indigo-50"
  }
];

export const DailyTimeline = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-3xl mx-auto text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">A smoother day, by design.</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">See how AdminLess works alongside your existing routine.</p>
          </div>

          <div className="max-w-4xl mx-auto relative">
              {/* Vertical Line */}
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 -translate-x-1/2 hidden md:block" />
              
              <div className="space-y-12 md:space-y-24">
                  {EVENTS.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className={cn(
                            "relative flex flex-col md:flex-row items-start md:items-center gap-8",
                            i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                        )}
                      >
                          {/* Circle Marker */}
                          <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 bg-blue-600 z-10 hidden md:block shadow-lg shadow-blue-500/20" />

                          {/* Content Side */}
                          <div className="flex-1 w-full pl-12 md:pl-0">
                              <div className={cn(
                                "p-6 md:p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/5 group",
                                i % 2 === 0 ? "md:text-right" : "md:text-left"
                              )}>
                                  <div className={cn(
                                    "inline-flex p-2.5 rounded-xl mb-4 transition-colors group-hover:bg-blue-600 group-hover:text-white",
                                    item.bg, item.color
                                  )}>
                                      <item.icon className="w-5 h-5" />
                                  </div>
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">{item.time}</h4>
                                  <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{item.title}</h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                      {item.desc}
                                  </p>
                              </div>
                          </div>

                          {/* Empty Side for Spacing */}
                          <div className="flex-1 hidden md:block" />
                      </motion.div>
                  ))}
              </div>
          </div>

          <div className="mt-20 text-center">
              <div className="inline-flex items-center gap-2 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-sm font-bold">
                  <Coffee className="h-4 w-4" />
                  <span>Administrative finalisation that used to take days now takes minutes.</span>
              </div>
          </div>
      </div>
    </section>
  );
};