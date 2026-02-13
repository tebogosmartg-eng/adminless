"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AI_FEATURES = [
  {
    title: "Strategic Recommendations",
    desc: "AI identifies specific areas for intervention, like 'Focus on algebra basics before the Term 3 test'.",
    icon: TrendingUp
  },
  {
    title: "Draft Report Comments",
    desc: "Generate professional, constructive comments based on a learner's actual performance history.",
    icon: MessageSquareQuote
  },
  {
    title: "Optical Roster Scanning",
    desc: "Save hours of typing by scanning handwritten paper marksheets directly into your register.",
    icon: Brain
  }
];

export const AiAssistantSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-10 bg-purple-600/5 rounded-full blur-[80px] pointer-events-none" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 text-white overflow-hidden"
              >
                  <div className="flex items-center gap-2 mb-8">
                      <div className="p-2 bg-purple-600 rounded-lg">
                          <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Assistant Preview</span>
                  </div>

                  <div className="space-y-6">
                      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                          <p className="text-[10px] font-bold text-purple-400 uppercase mb-2">Executive Summary</p>
                          <p className="text-sm leading-relaxed text-slate-300">
                              "Performance is stable, but there is a notable correlation between low attendance and failing grades in your Tuesday practical sessions."
                          </p>
                      </div>

                      <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase px-2">Recommendations</p>
                          <div className="flex gap-3 p-3 bg-blue-600/10 rounded-xl border border-blue-600/20">
                              <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                              <p className="text-xs text-blue-100">Schedule a 10-minute recap of 'Photosynthesis' before the next quiz.</p>
                          </div>
                          <div className="flex gap-3 p-3 bg-purple-600/10 rounded-xl border border-purple-600/20">
                              <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                              <p className="text-xs text-purple-100">Identify top performers to assist struggling learners in peer-learning groups.</p>
                          </div>
                      </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Teacher Approved</span>
                      </div>
                      <Badge variant="outline" className="text-purple-400 border-purple-800 text-[9px]">ASSISTIVE AI</Badge>
                  </div>
              </motion.div>
          </div>

          <div className="order-1 lg:order-2 space-y-8">
            <div>
                <Badge className="bg-purple-600/10 text-purple-600 border-none mb-4 px-3 py-1 uppercase tracking-[0.15em] text-[10px] font-black">Ethical Intelligence</Badge>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">AI that supports, not replaces.</h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                    We use AI to automate the "grunt work" of teaching—like scanning marksheets and drafting comments—giving you more time for actual pedagogy.
                </p>
            </div>

            <div className="grid gap-6">
                {AI_FEATURES.map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                        <div className="mt-1 bg-purple-50 dark:bg-purple-900/20 p-2.5 rounded-xl h-fit text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white duration-300">
                            <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-xs text-amber-800 dark:text-amber-400 font-bold leading-relaxed">
                    "Our AI policy is simple: The teacher is always in control. Every AI output is a draft that you must review and approve."
                </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};