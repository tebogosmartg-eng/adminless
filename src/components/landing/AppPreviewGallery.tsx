"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, FileText, Camera, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const SCREENSHOTS = [
  {
    title: "Insightful Dashboard",
    desc: "A high-level view of your daily agenda, marking debt, and learner alerts.",
    icon: LayoutDashboard,
    color: "bg-blue-600",
    image: "/placeholder.svg" // In a real app, these would be actual UI screenshots
  },
  {
    title: "Smart Marksheets",
    desc: "Weighting and totals calculated automatically with strict data integrity checks.",
    icon: FileText,
    color: "bg-purple-600",
    image: "/placeholder.svg"
  },
  {
    title: "AI Script Scanning",
    desc: "Extract scores directly from handwritten paper marksheets using your camera.",
    icon: Camera,
    color: "bg-pink-600",
    image: "/placeholder.svg"
  },
  {
    title: "Evidence Audit",
    desc: "Maintain a secure digital folder of moderation scripts for every learner.",
    icon: ShieldCheck,
    color: "bg-green-600",
    image: "/placeholder.svg"
  }
];

export const AppPreviewGallery = () => {
  return (
    <section className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-20">
          <Badge className="bg-blue-600/10 text-blue-600 border-none mb-4 px-3 py-1 uppercase tracking-[0.15em] text-[10px] font-black">Proof of Product</Badge>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">A professional interface for professional educators.</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Clean, fast, and optimized for both desktop planning and mobile classroom use.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {SCREENSHOTS.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-500" />
                <div className="relative aspect-video rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                   {/* Simulated UI Content */}
                   <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                      <item.icon className="w-20 h-20 text-slate-200 dark:text-slate-700" />
                   </div>
                   <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                      <span className="text-white font-bold text-lg">{item.title}</span>
                   </div>
                </div>
              </div>
              <div className="px-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", item.color)} />
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">{item.title}</h4>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};