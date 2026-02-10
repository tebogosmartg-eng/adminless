"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from "lucide-react";

export const LandingFooter = () => {
  return (
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
  );
};