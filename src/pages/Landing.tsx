"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
    ShieldCheck, 
    BookOpen, 
    Users, 
    ClipboardCheck, 
    FileText, 
    ArrowRight,
    CheckCircle2,
    CalendarDays,
    Sparkles
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] text-slate-900 dark:text-slate-100">
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
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 md:px-8 text-center max-w-4xl">
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800 mb-6 py-1 px-4 text-xs font-bold uppercase tracking-widest">
            Built for South African Classrooms
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-slate-900 dark:text-white leading-[1.1]">
            Less Admin. <span className="text-blue-600">More Teaching.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            A quiet, professional workspace for educators to manage marks, attendance, and reporting without the usual paperwork headache.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-blue-200 dark:shadow-none">
                Start Your Digital Register
              </Button>
            </Link>
            <p className="text-sm text-slate-500 font-medium">Free for individual teachers.</p>
          </div>
        </div>
      </section>

      {/* Trust & Context Section */}
      <section className="bg-white dark:bg-slate-900/50 py-16 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="grid md:grid-cols-3 gap-12">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg">SA-SAMS Aligned</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Export marks in the exact format required for SA-SAMS imports. No more manual re-typing at the end of the term.
                    </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                        <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-bold text-lg">Offline-First Design</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Classrooms aren't always connected. Capture marks and attendance offline; we sync automatically when you're back on Wi-Fi.
                    </p>
                </div>
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                        <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-lg">Moderation Ready</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Digitally store evidence for departmental audits. Generate professional marksheet drafts for HOD approval in seconds.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* Feature Focus */}
      <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b]">
        <div className="container mx-auto px-4 md:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">The tool you actually need, <br/>minus the complexity.</h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            We know that school systems are often slow and over-complicated. AdminLess is designed to be the simple companion that works the way you do.
                        </p>
                    </div>

                    <ul className="space-y-6">
                        <li className="flex gap-4">
                            <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold">Smart Mark Capture</h4>
                                <p className="text-sm text-slate-500">Dictate marks via voice, type them in fractions (17/20), or scan paper lists using your camera.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded">
                                <CalendarDays className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold">Effortless Attendance</h4>
                                <p className="text-sm text-slate-500">Quick-tap registers with automated monthly reporting for your departmental files.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-1 rounded">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold">Automated Analysis</h4>
                                <p className="text-sm text-slate-500">Identify at-risk learners early with built-in trend analysis and grading symbol distribution.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl blur-2xl opacity-50" />
                    <Card className="relative border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-800">
                        <CardContent className="p-0">
                            <div className="bg-slate-50 dark:bg-slate-900 border-b p-4 flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                </div>
                                <div className="mx-auto bg-slate-200 dark:bg-slate-800 h-4 w-48 rounded" />
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="h-6 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                                    <div className="h-8 w-8 bg-blue-500/20 rounded animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700">
                                            <div className="h-4 w-40 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                                            <div className="h-6 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-20 bg-blue-50 dark:bg-blue-900/20 rounded-xl" />
                                    <div className="h-20 bg-green-50 dark:bg-green-900/20 rounded-xl" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 md:px-8">
            <div className="bg-blue-700 dark:bg-blue-950 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight">Your time is valuable.</h2>
                    <p className="text-blue-100 text-lg opacity-90">
                        Join the hundreds of South African teachers reclaiming their afternoons from administrative burden.
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/login">
                            <Button size="lg" variant="secondary" className="px-10 h-14 text-lg font-bold text-blue-700">
                                Create Your Free Account
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center justify-center gap-6 text-[10px] uppercase font-black tracking-widest text-blue-200 opacity-60">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> No Credit Card</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> SA-SAMS Ready</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> CAPS Compatible</span>
                    </div>
                </div>
                {/* Subtle Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-32 -mb-32" />
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
                © {new Date().getFullYear()} AdminLess. Built for the modern South African educator.
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

// Internal Helper
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
        {children}
    </div>
);

import { cn } from "@/lib/utils";

export default Landing;