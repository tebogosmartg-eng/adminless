"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Users, FileSpreadsheet, ShieldAlert, BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoRequestDialog } from './LandingActions';

const INSTITUTIONAL_BENEFITS = [
  {
    title: "Standardized Subject Reporting",
    desc: "Ensure every teacher in your department uses the same weighting and grading logic.",
    icon: FileSpreadsheet
  },
  {
    title: "Live Moderation Visibility",
    desc: "HODs can view evidence folders and marks in real-time without chasing paper files.",
    icon: ShieldAlert
  },
  {
    title: "Cohort-Level Analytics",
    desc: "Identify performance gaps across entire grades, not just individual classes.",
    icon: BarChart3
  },
  {
    title: "Simplified Handover",
    desc: "Rosters and historical data remain with the school, making teacher transitions seamless.",
    icon: Users
  }
];

export const InstitutionalSection = () => {
  return (
    <section className="py-24 bg-blue-900 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none">
          <Users className="w-96 h-96" />
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-5xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-8">
                      <div>
                        <h4 className="text-blue-300 font-black text-[10px] uppercase tracking-[0.2em] mb-4">For HODs & School Leaders</h4>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6 leading-[1.1]">Scale AdminLess across your whole school.</h2>
                        <p className="text-blue-100/80 text-lg leading-relaxed">
                            Bring consistency, transparency, and data-driven insights to your entire department. Reduce the term-end burden for all your teachers.
                        </p>
                      </div>

                      <div className="grid gap-6">
                          {INSTITUTIONAL_BENEFITS.map((item, i) => (
                              <div key={i} className="flex gap-4 group">
                                  <div className="mt-1 bg-white/10 p-2 rounded-xl h-fit">
                                      <item.icon className="h-5 w-5 text-blue-200" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-white text-base">{item.title}</h4>
                                      <p className="text-sm text-blue-100/60 leading-relaxed">{item.desc}</p>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="pt-4">
                          <DemoRequestDialog>
                            <Button className="bg-white text-blue-900 hover:bg-blue-50 font-black h-12 px-8 rounded-xl gap-2 shadow-xl shadow-blue-950/50">
                                Request School Pilot <ChevronRight className="h-4 w-4" />
                            </Button>
                          </DemoRequestDialog>
                      </div>
                  </div>

                  <div className="relative">
                      <div className="bg-blue-800/50 border border-blue-700 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl">
                          <div className="flex items-center gap-3 mb-8">
                              <div className="w-3 h-3 rounded-full bg-red-400" />
                              <div className="w-3 h-3 rounded-full bg-yellow-400" />
                              <div className="w-3 h-3 rounded-full bg-green-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest ml-auto text-blue-300">Department Dashboard</span>
                          </div>
                          
                          <div className="space-y-6">
                              <div className="h-24 bg-blue-900/40 rounded-2xl border border-blue-700/50 p-4 flex flex-col justify-between">
                                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Total Department Pass Rate</span>
                                  <span className="text-4xl font-black">84%</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="h-20 bg-blue-900/40 rounded-2xl border border-blue-700/50 p-4">
                                      <div className="h-2 w-12 bg-blue-700 rounded mb-2" />
                                      <div className="h-4 w-20 bg-blue-500 rounded" />
                                  </div>
                                  <div className="h-20 bg-blue-900/40 rounded-2xl border border-blue-700/50 p-4">
                                      <div className="h-2 w-12 bg-blue-700 rounded mb-2" />
                                      <div className="h-4 w-16 bg-blue-500 rounded" />
                                  </div>
                              </div>
                              <div className="space-y-3 pt-2">
                                  {[1, 2, 3].map(i => (
                                      <div key={i} className="h-8 bg-blue-900/40 rounded-lg border border-blue-700/50 flex items-center px-3 justify-between">
                                          <div className="h-2 w-24 bg-blue-700/60 rounded" />
                                          <div className="h-2 w-8 bg-green-500/60 rounded" />
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="absolute -bottom-6 -right-6 bg-blue-600 p-6 rounded-2xl shadow-2xl border-4 border-blue-900">
                              <p className="text-xs font-bold leading-tight max-w-[140px]">
                                  "Standardize reporting in minutes, not days."
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </section>
  );
};