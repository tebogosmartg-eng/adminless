"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Standard",
    price: "Free",
    description: "The full toolkit for professional educators.",
    features: [
      "Unlimited classes",
      "Academic year & term control",
      "SA-SAMS-aligned marksheets",
      "Attendance register",
      "Class-level analytics",
      "Draft & final exports",
      "Evidence & moderation tools"
    ],
    buttonText: "Start Free",
    link: "/login",
    highlight: true,
    badge: "Community Access"
  }
];

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Transparent access for teachers</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Free for individual educators. No hidden tiers.</p>
        </div>

        <div className="flex justify-center">
          {PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={cn(
                "relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 bg-white dark:bg-slate-900 max-w-md w-full",
                plan.highlight 
                  ? "border-blue-600 shadow-xl shadow-blue-500/10 z-10" 
                  : "border-slate-100 dark:border-slate-800"
              )}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-600 border-none uppercase tracking-widest text-[10px] px-3 py-1 font-black">
                  {plan.badge}
                </Badge>
              )}

              <div className="mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                </div>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-full p-0.5 bg-blue-100 text-blue-600"
                    )}>
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to={plan.link}>
                <Button 
                  className={cn(
                    "w-full h-12 rounded-xl font-bold transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  {plan.buttonText}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400">
            <Info className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Individual data privacy is our priority.</span>
          </div>
        </div>
      </div>
    </section>
  );
};