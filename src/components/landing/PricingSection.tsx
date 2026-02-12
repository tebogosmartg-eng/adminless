"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Startup",
    price: "Free",
    description: "Perfect for exploring the platform with one class.",
    features: [
      "1 active class",
      "Academic year & term control",
      "SA-SAMS-aligned marksheets",
      "Attendance register",
      "Class-level analytics",
      "Draft & final exports"
    ],
    buttonText: "Start Free",
    link: "/login",
    highlight: false
  },
  {
    name: "Member",
    price: "R79",
    period: "per month",
    description: "The full toolkit for dedicated professional educators.",
    features: [
      "Everything in Startup",
      "Unlimited classes",
      "Unlimited assessments",
      "Full reporting & exports",
      "Evidence & moderation tools",
      "Personal teaching timetable"
    ],
    buttonText: "Get Started",
    link: "/login",
    highlight: true,
    badge: "Most Popular"
  },
  {
    name: "Premium",
    price: "R95",
    period: "per month",
    description: "Leverage AI to minimize your administrative load.",
    features: [
      "Everything in Member",
      "AI marksheet scanning",
      "AI-generated report comments",
      "Advanced analytics",
      "Priority support"
    ],
    buttonText: "Get Started",
    link: "/login",
    highlight: false
  }
];

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-[#fcfcfd] dark:bg-[#0a0a0b] border-t border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Start small. Upgrade only when you're ready.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={cn(
                "relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 bg-white dark:bg-slate-900",
                plan.highlight 
                  ? "border-blue-600 shadow-xl shadow-blue-500/10 scale-105 z-10" 
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
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
                  {plan.period && <span className="text-slate-500 text-sm font-medium">{plan.period}</span>}
                </div>
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-full p-0.5",
                      plan.highlight ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
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
                    "w-full h-12 rounded-xl font-bold transition-all active:scale-[0.98]",
                    plan.highlight 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
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
            <span className="text-xs font-bold uppercase tracking-wide">No contracts. Cancel anytime. Your data stays yours.</span>
          </div>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            All prices include VAT where applicable.
          </p>
        </div>
      </div>
    </section>
  );
};