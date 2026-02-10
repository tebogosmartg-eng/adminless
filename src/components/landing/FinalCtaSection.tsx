"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

export const FinalCtaSection = () => {
  return (
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
  );
};