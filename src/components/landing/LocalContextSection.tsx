"use client";

import React from 'react';
import { ShieldCheck, Heart, MapPin, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export const LocalContextSection = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-8 text-center md:text-left">
                <div>
                    <Badge className="bg-red-600/10 text-red-600 border-none mb-4 px-3 py-1 uppercase tracking-[0.15em] text-[10px] font-black">Local Heritage</Badge>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">By South African teachers. <br className="hidden md:block" /> For South African teachers.</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-medium">
                        AdminLess was born in a real classroom in Gauteng. We understand the specific pressure of term-end moderation, the complexity of SA-SAMS, and the importance of offline access in our local context.
                    </p>
                </div>

                <div className="grid gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapPin className="w-5 h-5" /></div>
                        <span className="text-sm font-bold">100% Proudly South African Development</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600"><Heart className="w-5 h-5" /></div>
                        <span className="text-sm font-bold">Designed to support the local teaching community</span>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-80 relative">
                <div className="aspect-[3/4] rounded-[2.5rem] bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-2xl relative group">
                    {/* Artistic Placeholder for Founder/Team/Community Photo */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <ShieldCheck className="w-16 h-16 text-blue-600/20 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Authenticity Guaranteed</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-600/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl">
                        <p className="text-xs font-bold leading-relaxed italic">
                            "We didn't build this as a tech project. We built it because we were tired of being overwhelmed by admin."
                        </p>
                        <div className="mt-2 h-0.5 w-12 bg-blue-600" />
                    </div>
                </div>
                
                {/* Visual Flair */}
                <div className="absolute -top-4 -right-4 bg-amber-400 p-3 rounded-2xl shadow-xl shadow-amber-200 dark:shadow-none rotate-12">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};