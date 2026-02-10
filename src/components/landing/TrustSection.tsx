"use client";

import React from 'react';
import { Shield, Hand, User, Lock } from "lucide-react";

const TRUST_POINTS = [
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
];

export const TrustSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
      <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Why teachers trust AdminLess</h2>
              <p className="text-slate-600 dark:text-slate-400">
                  Built by local educators, AdminLess is designed to respect the teacher's role and school policies.
              </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
              {TRUST_POINTS.map((item, i) => (
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
  );
};