"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { DemoRequestDialog } from './LandingActions';

export const FinalCtaSection = () => {
  return (
    <section className="py-32 bg-blue-600 text-white overflow-hidden relative">
      {/* Dynamic Background Polish */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[80%] bg-white rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[80%] bg-indigo-200 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="container mx-auto px-4 md:px-8 text-center relative z-10 max-w-3xl">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-black tracking-tight mb-8 leading-[1.1]"
          >
            Start small. <br className="md:hidden" />
            Feel the difference.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-blue-100 mb-12 leading-relaxed max-w-2xl mx-auto font-medium"
          >
            Try AdminLess with one class, one subject, one term. <br className="hidden md:block" />
            Zero pressure. No disruption.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
              <Link to="/pilot-signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full bg-white text-blue-600 hover:bg-slate-50 h-16 px-12 text-lg font-black rounded-2xl shadow-2xl shadow-blue-900/40 transition-all duration-200 hover:scale-[1.03] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-white">
                      Start free teacher pilot
                  </Button>
              </Link>
              <DemoRequestDialog>
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-blue-300 text-white hover:bg-blue-700 hover:border-blue-700 h-16 px-10 text-base font-bold rounded-2xl transition-all duration-200 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-white shadow-lg">
                    Book a live demo
                </Button>
              </DemoRequestDialog>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-10 text-sm text-blue-200 font-bold uppercase tracking-[0.1em]"
          >
              Join hundreds of educators reducing their admin burden.
          </motion.p>
      </div>
    </section>
  );
};