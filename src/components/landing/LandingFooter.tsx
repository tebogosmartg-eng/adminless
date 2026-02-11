"use client";

import React from 'react';
import { DataCommitmentDialog } from './LandingActions';
import icon from "@/source bucket/Icon.png";

export const LandingFooter = () => {
  return (
    <footer className="border-t py-12 bg-white dark:bg-black/50 no-print">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
                <img src={icon} alt="AdminLess Icon" className="h-8 w-auto object-contain" />
                <span className="font-bold text-blue-600">AdminLess</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Designed for South African educators.</p>
          </div>
          
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-slate-500">
              <button 
                className="hover:text-blue-600 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1" 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                About AdminLess
              </button>
              <DataCommitmentDialog>
                <button className="hover:text-blue-600 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">
                    Data & AI Commitment
                </button>
              </DataCommitmentDialog>
              <a href="mailto:support@adminless.co.za" className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">
                  Contact
              </a>
              <DataCommitmentDialog>
                <button className="hover:text-blue-600 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">
                    Privacy & Terms
                </button>
              </DataCommitmentDialog>
          </div>
        </div>
        
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
            © {new Date().getFullYear()} AdminLess. Less admin. More teaching.
        </div>
      </div>
    </footer>
  );
};