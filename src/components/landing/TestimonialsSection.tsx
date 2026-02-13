"use client";

import React from 'react';
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TESTIMONIALS = [
  {
    quote: "AdminLess saved me 4 hours of marking prep every week. I can finally focus on my learners instead of fighting with spreadsheets.",
    author: "Mrs. Mndeni",
    role: "Grade 10 Mathematics",
    initials: "NM"
  },
  {
    quote: "The SA-SAMS export is a absolute lifesaver. No more manual data entry errors during the term-end rush. My HOD is much happier.",
    author: "Mr. Botha",
    role: "HOD Social Sciences",
    initials: "JB"
  },
  {
    quote: "Scanning paper marksheets with my phone feels like magic. It's the first tool I've used that actually understands a teacher's workflow.",
    author: "Sarah J.",
    role: "Intermediate Phase Teacher",
    initials: "SJ"
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Loved by educators</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Join teachers across South Africa reclaiming their time.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="flex flex-col p-8 rounded-[2rem] bg-[#fcfcfd] dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative group transition-all hover:shadow-xl hover:shadow-blue-500/5">
              <div className="mb-6 text-blue-600/20 group-hover:text-blue-600/40 transition-colors">
                <Quote className="h-10 w-10 fill-current" />
              </div>
              
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-8 flex-1 italic">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">{t.initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{t.author}</span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{t.role}</span>
                </div>
              </div>
              
              <div className="absolute top-8 right-8 flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};