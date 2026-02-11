"use client";

import React from 'react';
import { PilotSignupForm } from '@/components/PilotSignupForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import icon from "@/source bucket/ICON.png";

const PilotSignup = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <Link to="/welcome" className="group flex items-center gap-4 hover:scale-105 transition-transform active:scale-95">
            <img 
              src={icon} 
              alt="AdminLess Icon" 
              className="h-20 w-auto object-contain" 
            />
            <span className="text-3xl font-black tracking-tighter">AdminLess</span>
        </Link>
        <Link to="/welcome">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground font-bold">
                <ArrowLeft className="h-4 w-4" /> Back
            </Button>
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3.5rem] border shadow-2xl shadow-blue-500/5 p-8 md:p-14">
        <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tight mb-4">Join the Teacher Pilot</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                Set up your private workspace in under 60 seconds.
            </p>
        </div>

        <PilotSignupForm />

        <div className="mt-14 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                <img src={icon} alt="" className="h-8 w-auto opacity-40 grayscale object-contain" />
                Your data stays yours.
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                AdminLess Pilot v3.1
            </p>
        </div>
      </div>
    </div>
  );
};

export default PilotSignup;