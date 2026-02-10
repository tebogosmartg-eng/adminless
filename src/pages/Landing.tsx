"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
    ShieldCheck, 
    CheckCircle2, 
    Play,
    Clock,
    Calculator,
    AlertCircle,
    FileText,
    Layers
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">AdminLess</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-sm font-medium">Teacher Login</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6">Get Started</Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-20 pb-24 md:pt-32 md:pb-40 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full -z-10 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-50 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-8 text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full py-1 px-4 mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Designed for South African schools
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.05]">
            Less admin.<br />
            <span className="text-blue-600">More teaching.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
            AdminLess helps teachers manage marks, classes, and reports without the paperwork stress — while staying aligned with SA-SAMS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-14 text-lg font-bold shadow-xl shadow-blue-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95">
                Try AdminLess with one class
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="px-8 h-14 text-base font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2 hover:bg-slate-50">
              <Play className="h-4 w-4 fill-current" /> See how it works
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" /> Built for real classrooms
            </div>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" /> Private & Secure
            </div>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" /> Free to get started
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Teaching shouldn’t feel like paperwork.</h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    We know that educators are currently burdened by increasing administrative requirements that take time away from the classroom.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {[
                    {
                        title: "Time lost rewriting marks",
                        desc: "Stop copying the same names and scores between marksheets, registers, and official systems.",
                        icon: Clock
                    },
                    {
                        title: "Manual calculations",
                        desc: "No more calculators. Weighting, totals, and percentages are handled automatically and accurately.",
                        icon: Calculator
                    },
                    {
                        title: "Fear of making mistakes",
                        desc: "Manual entry leads to errors. Our validation checks ensure your data is consistent before you export.",
                        icon: AlertCircle
                    },
                    {
                        title: "Unfamiliar reporting formats",
                        desc: "We align your data with standard South African school formats so you don't have to guess.",
                        icon: FileText
                    },
                    {
                        title: "Admin overload",
                        desc: "Term-end shouldn't be a crisis. Manage your workload day-by-day with simple, reliable tools.",
                        icon: Layers
                    }
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#fcfcfd] dark:bg-slate-900 transition-all hover:border-blue-100 dark:hover:border-blue-900/50 group">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                            <item.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className="font-bold mb-2">{item.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="text-center">
                <p className="text-lg font-semibold text-slate-500 dark:text-slate-400 italic">
                    "AdminLess exists to reduce admin — not add another system."
                </p>
            </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t py-12 bg-white dark:bg-black/50">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <span className="font-bold">AdminLess</span>
            </div>
            <div className="text-sm text-slate-500 font-medium">
                © {new Date().getFullYear()} AdminLess. Developed for the South African educator.
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
                <Link to="#" className="hover:text-blue-600 transition-colors">Privacy</Link>
                <Link to="#" className="hover:text-blue-600 transition-colors">Terms</Link>
                <Link to="#" className="hover:text-blue-600 transition-colors">Contact</Link>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;