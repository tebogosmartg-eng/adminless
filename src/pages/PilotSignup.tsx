"use client";

import React from 'react';
import { PilotSignupForm } from '@/components/PilotSignupForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logo from "@/source bucket/AdminLess logo.png";

const PilotSignup = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
        <Link to="/welcome" className="group flex items-center gap-4 hover:scale-105 transition-transform active:scale-95">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
              <img src={logo} alt="AdminLess Logo" className="h-10 w-10 object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter">AdminLess</span>
        </Link>
        <Link to="/welcome">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground font-bold">
                <ArrowLeft className="h-4 w-4" /> Back
            </Button>
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] border shadow-2xl shadow-blue-500/5 p-8 md:p-12">
        <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight mb-3">Join the Teacher Pilot</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
                Set up your private workspace in under 60 seconds.
            </p>
        </div>

        <PilotSignupForm />

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <img src={logo} alt="" className="h-4 w-4 opacity-50 grayscale" />
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