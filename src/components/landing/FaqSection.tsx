"use client";

import React from 'react';
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
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
];

export const FaqSection = () => {
  return (
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
              {FAQS.map((item, i) => (
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
  );
};