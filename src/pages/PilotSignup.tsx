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
        <Link to="/welcome" className="group flex items-center gap-3">
            <img src={logo} alt="AdminLess Logo" className="h-6 w-6 object-contain" />
            <span className="text-xl font-bold tracking-tight">AdminLess</span>
        </Link>
        <Link to="/welcome">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
            </Button>
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] border shadow-xl shadow-blue-500/5 p-8 md:p-12">
        <div className="mb-10">
            <h1 className="text-3xl font-black tracking-tight mb-3">Join the Teacher Pilot</h1>
            <p className="text-slate-500 dark:text-slate-400">
                Set up your private workspace in under 60 seconds. We'll send a secure magic link to your email to sign you in instantly.
            </p>
        </div>

        <PilotSignupForm />

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                <img src={logo} alt="" className="h-3 w-3 opacity-50" />
                Your data stays yours. No spam.
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
                AdminLess Pilot v3.1 • South Africa
            </p>
        </div>
      </div>
    </div>
  );
};

export default PilotSignup;