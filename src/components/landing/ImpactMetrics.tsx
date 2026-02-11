"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, TrendingUp, Users } from 'lucide-react';

const METRICS = [
  { 
      label: "Hours saved weekly", 
      value: "4.5", 
      suffix: "hrs", 
      desc: "Average time reclaimed from manual mark preparation.",
      icon: Clock,
      color: "text-blue-600"
  },
  { 
      label: "Calculation Accuracy", 
      value: "100", 
      suffix: "%", 
      desc: "Elimination of human error in weighted term totals.",
      icon: CheckCircle2,
      color: "text-green-600"
  },
  { 
      label: "Term-End Speed", 
      value: "10", 
      suffix: "x", 
      desc: "Faster finalization compared to manual registers.",
      icon: TrendingUp,
      color: "text-purple-600"
  },
  { 
      label: "Active Educators", 
      value: "500", 
      suffix: "+", 
      desc: "Teachers across SA simplifying their daily admin.",
      icon: Users,
      color: "text-orange-600"
  }
];

export const ImpactMetrics = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {METRICS.map((metric, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="p-8 rounded-[2rem] bg-[#fcfcfd] dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center space-y-4 group transition-all hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
                    >
                        <div className="mx-auto w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors duration-500">
                            <metric.icon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-baseline justify-center gap-0.5">
                                <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                    {metric.value}
                                </span>
                                <span className={cn("text-xl font-bold", metric.color)}>{metric.suffix}</span>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            {metric.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
            
            <div className="mt-16 p-8 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-center">
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                    "AdminLess isn't just about software — it's about giving teachers their weekends back."
                </p>
            </div>
        </div>
      </div>
    </section>
  );
};

import { cn } from "@/lib/utils";