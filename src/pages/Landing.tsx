"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    ShieldCheck, 
    CheckCircle2, 
    Play, 
    Clock, 
    Calculator, 
    AlertCircle, 
    FileText, 
    Layers, 
    FileCheck, 
    UserCheck, 
    Target, 
    WifiOff, 
    Download, 
    CalendarRange, 
    ClipboardList, 
    Smartphone, 
    SendHorizonal, 
    Shield, 
    Hand, 
    Lock, 
    User, 
    BarChart3, 
    NotebookPen, 
    Users, 
    Building2, 
    Globe, 
    GraduationCap, 
    EyeOff, 
    DollarSign, 
    Send, 
    Sparkles, 
    ChevronRight, 
    HelpCircle, 
    ChevronDown, 
    FileSearch, 
    BadgeCheck 
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md no-print">
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

      {/* Features Grid */}
      <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need, nothing you don't.</h2>
                <p className="text-slate-500 dark:text-slate-400">A professional toolset for modern academic management.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { title: "Academic Control", icon: CalendarRange, desc: "Manage multi-year data with strict term-based scoping." },
                    { title: "Roster Management", icon: Users, desc: "Simple student lists with CSV import and AI roster scanning." },
                    { title: "Aligned Marksheets", icon: FileCheck, desc: "Automatic weighting and totals prepared for official submission." },
                    { title: "Class Analytics", icon: BarChart3, desc: "Real-time pass rates and performance trends for every group." },
                    { title: "Attendance Registers", icon: ClipboardList, desc: "Daily tracking with automated monthly consolidated logs." },
                    { title: "Evidence & Audit", icon: ShieldCheck, desc: "Attach moderation scripts and maintain a secure audit trail." },
                    { title: "Personal Timetable", icon: NotebookPen, desc: "Your daily teaching schedule synced with session records." },
                    { title: "Offline Sync", icon: WifiOff, desc: "Capture marks anywhere. Data syncs when you reach Wi-Fi." }
                ].map((feature, i) => (
                    <div key={i} className="flex flex-col gap-3 p-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                            <feature.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{feature.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Alignment Section */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
                    AdminLess works with how schools already operate.
                </h2>
                
                <div className="grid sm:grid-cols-2 gap-x-16 gap-y-10">
                    {[
                        { title: "Familiar SA-SAMS-aligned formats", icon: FileCheck, desc: "Export data that matches the forms you already use." },
                        { title: "Teacher-controlled finalisation", icon: UserCheck, desc: "You decide when the term is done and the marks are locked." },
                        { title: "Class-level focus (no misleading averages)", icon: Target, desc: "See clear, granular data for each student and class." },
                        { title: "Offline-friendly", icon: WifiOff, desc: "Capture attendance and marks without needing constant Wi-Fi." },
                        { title: "Audit-ready exports", icon: Download, desc: "Generate professional registers and moderation files instantly." }
                    ].map((bullet, i) => (
                        <div key={i} className="flex gap-5">
                            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <bullet.icon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-slate-900 dark:text-slate-100">{bullet.title}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{bullet.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </section>

      {/* National Alignment Details */}
      <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                <div>
                    <Badge className="bg-blue-600 mb-4 px-3 py-1 uppercase tracking-widest text-[10px]">National Compliance</Badge>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">Built for the South African academic structure.</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                        We've carefully engineered AdminLess to mirror the requirements of the DBE and provincial departments, making official reporting a breeze.
                    </p>
                    
                    <div className="space-y-6">
                        {[
                            { title: "SA-SAMS Ready", icon: SendHorizonal, desc: "Finalised term marks are exported in formats optimized for easy SA-SAMS entry." },
                            { title: "CAPS Aligned", icon: BadgeCheck, desc: "Supports weighting and grading systems required by the national curriculum." },
                            { title: "Moderation Support", icon: FileSearch, desc: "Track and upload the required 10% sample for departmental audit." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="mt-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg h-fit text-blue-600">
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">{item.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 rounded-[2rem] blur-2xl group-hover:opacity-100 transition-opacity opacity-50" />
                    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl">
                         <div className="flex items-center justify-between mb-8">
                             <div className="space-y-1">
                                <h4 className="font-black text-xs uppercase tracking-[0.15em] text-slate-400">Sample Export</h4>
                                <p className="font-bold text-lg">Term 3 Results</p>
                             </div>
                             <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">FINALIZED</Badge>
                         </div>
                         <div className="space-y-4">
                             {[1, 2, 3].map(i => (
                                <div key={i} className="h-10 w-full bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                             ))}
                             <div className="pt-6 mt-6 border-t border-dashed">
                                 <Button className="w-full bg-blue-600 text-white font-bold h-12">
                                     <Download className="mr-2 h-4 w-4" /> Download SASAMS Summary
                                 </Button>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-16 text-center">
                How AdminLess fits into your term
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
                {[
                    { title: "Set academic year & term", icon: CalendarRange, desc: "Start with a clean context for your year." },
                    { title: "Create classes & tasks", icon: ClipboardList, desc: "Set up your rosters and assessment titles." },
                    { title: "Capture marks safely", icon: Smartphone, desc: "Fast entry with auto-calculated totals." },
                    { title: "Export familiar marksheets", icon: FileText, desc: "Generate PDFs in your school's format." },
                    { title: "Submit with confidence", icon: SendHorizonal, desc: "Finalise your term and upload to SA-SAMS." }
                ].map((step, i) => (
                    <div key={i} className="relative flex flex-col items-center text-center group">
                        {i < 4 && (
                            <div className="hidden lg:block absolute top-6 left-1/2 w-full h-px border-t-2 border-dashed border-slate-200 dark:border-slate-800 -z-0" />
                        )}
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-4 relative z-10 shadow-lg shadow-blue-200 dark:shadow-none group-hover:scale-110 transition-transform">
                            {i + 1}
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-bold text-sm leading-tight px-4">{step.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">{step.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 text-center">
                    Built for South African schools
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-center text-lg mb-12 max-w-2xl mx-auto">
                    A platform designed to meet the unique administrative needs of our local education system.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    {[
                        { label: "Primary & secondary teachers", icon: GraduationCap },
                        { label: "HODs & Grade Heads", icon: UserCheck },
                        { label: "School administrators", icon: Building2 },
                        { label: "Public & independent schools", icon: Globe }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold leading-tight">{item.label}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-600 rounded-2xl p-8 text-center text-white shadow-xl shadow-blue-200 dark:shadow-none">
                    <p className="text-xl md:text-2xl font-bold leading-tight">
                        "AdminLess supports existing processes — it doesn’t disrupt them."
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* Data Sovereignty Section */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">Your data stays yours</h2>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {[
                        { title: "No hidden automation", icon: EyeOff, desc: "We never run scripts or processes behind your back." },
                        { title: "No data selling", icon: DollarSign, desc: "Your school data is never shared with third-party advertisers." },
                        { title: "No auto-submissions", icon: Send, desc: "Data is only exported when you physically click 'Export'." },
                        { title: "Ethical AI", icon: Sparkles, desc: "AI is assistive, optional, and always editable by the teacher." }
                    ].map((point, i) => (
                        <div key={i} className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                                <point.icon className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-sm">{point.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">{point.desc}</p>
                        </div>
                    ))}
                </div>

                <Link to="#" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline group">
                    Read our Data & AI Commitment
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
            <div className="text-center mb-16">
                <div className="inline-flex p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 mb-4">
                    <HelpCircle className="h-6 w-6" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">Common Questions</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-4">Everything you need to know about starting with AdminLess.</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                    { 
                        q: "Is it really free for individual teachers?", 
                        a: "Yes! AdminLess is free to use for individual educators managing their own classes. We believe in supporting the teaching community directly." 
                    },
                    { 
                        q: "Does it work without an internet connection?", 
                        a: "Absolutely. AdminLess is 'offline-first'. You can capture attendance and marks while in the classroom, and the app will automatically sync to your private cloud whenever you next reach Wi-Fi." 
                    },
                    { 
                        q: "How does it help with SA-SAMS?", 
                        a: "AdminLess isn't a replacement for SA-SAMS; it's a productivity bridge. We provide official CSV and PDF formats that match SAMS requirements, so you just copy the totals across without manually calculating weighted averages." 
                    },
                    { 
                        q: "Can I import my existing class lists?", 
                        a: "Yes. You can upload any CSV file or even scan a paper class list using our built-in AI camera tool to populate your rosters in seconds." 
                    },
                    { 
                        q: "Is my student data secure?", 
                        a: "Data privacy is our top priority. All student information is encrypted and stored in your private account. We do not share data with third parties or use it for advertising." 
                    }
                ].map((item, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border rounded-2xl bg-white dark:bg-slate-900 px-6">
                        <AccordionTrigger className="text-sm font-bold text-left hover:no-underline">{item.q}</AccordionTrigger>
                        <AccordionContent className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {item.a}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Why teachers trust AdminLess</h2>
                <p className="text-slate-600 dark:text-slate-400">
                    Built by local educators, AdminLess is designed to respect the teacher's role and school policies.
                </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
                {[
                    {
                        title: "Does not replace SA-SAMS",
                        desc: "AdminLess is a preparation tool. It cleans and formats your data specifically for the final school system.",
                        icon: Shield
                    },
                    {
                        title: "Does not auto-submit data",
                        desc: "Data only moves when you choose to export it. You remain the guardian of your class records.",
                        icon: Hand
                    },
                    {
                        title: "Does not rank or judge",
                        desc: "This is a private workspace. There are no competitive dashboards or teacher performance rankings.",
                        icon: User
                    },
                    {
                        title: "Keeps teachers in control",
                        desc: "You decide when a task is finished, when a register is correct, and when a term is finalised.",
                        icon: Lock
                    }
                ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <div className="flex-shrink-0">
                            <item.icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    "AdminLess prepares clean data — teachers decide when it’s final."
                </p>
            </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-blue-600 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-white rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[70%] bg-indigo-200 rounded-full blur-[120px]" />
        </div>
        
        <div className="container mx-auto px-4 md:px-8 text-center relative z-10 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Start small. Feel the difference.</h2>
            <p className="text-xl text-blue-100 mb-10 leading-relaxed">
                Try AdminLess with one class, one subject, one term.<br />
                No pressure. No disruption.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-10 text-lg font-bold shadow-xl shadow-blue-900/20">
                        Start a free pilot
                    </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-blue-300 text-white hover:bg-blue-700 h-14 px-8 text-base font-semibold">
                    Book a demo
                </Button>
            </div>
            
            <p className="mt-8 text-sm text-blue-200 font-medium">
                Join hundreds of educators reducing their administrative burden.
            </p>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t py-12 bg-white dark:bg-black/50 no-print">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <span className="font-bold">AdminLess</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Designed for South African educators.</p>
            </div>
            
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
                <Link to="#" className="hover:text-blue-600 transition-colors">About AdminLess</Link>
                <Link to="#" className="hover:text-blue-600 transition-colors">Data & AI Commitment</Link>
                <Link to="#" className="hover:text-blue-600 transition-colors">Contact</Link>
                <Link to="#" className="hover:text-blue-600 transition-colors">Privacy & Terms</Link>
            </div>
          </div>
          
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              © {new Date().getFullYear()} AdminLess. Less admin. More teaching.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;