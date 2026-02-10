"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Play, CheckCircle2 } from "lucide-react";

export const LandingHero = () => {
  const scrollToWorkflow = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="flex flex-col items-center justify-center pt-20 pb-24 md:pt-32 md:pb-40 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10 opacity-40">
          <div className="absolute top-10 left-0 w-[40rem] h-[40rem] bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-10 right-0 w-[35rem] h-[35rem] bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 md:px-8 text-center max-w-4xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-full py-1.5 px-4 mb-8 shadow-sm backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              Designed for South African schools
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.05]"
        >
          Less admin.<br />
          <span className="text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">More teaching.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto font-medium"
        >
          AdminLess helps teachers manage marks, classes, and reports without the paperwork stress — while staying aligned with SA-SAMS.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link to="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-10 h-14 text-lg font-bold shadow-lg shadow-blue-200/50 dark:shadow-none hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-blue-400 ring-offset-2">
              Try AdminLess with one class
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={scrollToWorkflow}
            className="w-full sm:w-auto px-8 h-14 text-base font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-slate-400 ring-offset-2 shadow-sm hover:shadow-md"
          >
            <Play className="h-4 w-4 fill-current" /> See how it works
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
        >
          <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500/70" /> Built for real classrooms
          </div>
          <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500/70" /> Private & Secure
          </div>
          <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500/70" /> Free to get started
          </div>
        </motion.div>
      </div>
    </section>
  );
};