"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Focus on your classroom, not the costs.</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">AdminLess is currently free for individual educators managing their own classes.</p>
        </div>

        <div className="max-w-2xl mx-auto">
            <div className="relative flex flex-col p-8 md:p-12 rounded-[2.5rem] border-2 border-blue-600 bg-white dark:bg-slate-900 shadow-2xl shadow-blue-500/10">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-600 border-none uppercase tracking-widest text-[10px] px-4 py-1 font-black">
                Teacher Edition
              </Badge>

              <div className="text-center mb-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Individual Educator</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black">Free</span>
                </div>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  The complete toolkit to reclaim your time and stay compliant.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-10">
                {[
                  "Unlimited classes & learners",
                  "Academic year & term scoping",
                  "SA-SAMS-aligned marksheets",
                  "Daily attendance registers",
                  "Consolidated term reports",
                  "Secure evidence audit folders",
                  "Classroom management tools",
                  "Personal teaching timetable"
                ].map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full p-0.5 bg-blue-100 text-blue-600">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to="/login" className="w-full">
                <Button className="w-full h-14 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]">
                  Launch Your Workspace
                </Button>
              </Link>

              <div className="mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-black text-slate-400">
                  <ShieldCheck className="h-3 w-3" />
                  Your data stays yours. Private & Secure.
              </div>
            </div>
        </div>
      </div>
    </section>
  );
};