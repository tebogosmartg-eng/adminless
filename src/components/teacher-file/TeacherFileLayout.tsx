"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface TeacherFileLayoutProps {
  children: React.ReactNode;
  pageNumber?: number;
  className?: string;
}

export const TeacherFileLayout = ({ children, pageNumber, className }: TeacherFileLayoutProps) => {
  return (
    <div className={cn(
        "relative mx-auto bg-white shadow-2xl mb-12 print:shadow-none print:mb-0 transition-all duration-500",
        "w-full max-w-[210mm] min-h-[297mm]", 
        "p-[20mm] flex flex-col",
        className
    )}>
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-8">
        <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Official Academic Record</span>
            <span className="text-xs font-bold text-slate-400">Teacher Portfolio & File</span>
        </div>
        <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">AdminLess v3.1</span>
        </div>
      </div>

      <div className="flex-1">
        {children}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>© {new Date().getFullYear()} AdminLess</span>
        {pageNumber && <span>Page {pageNumber}</span>}
      </div>

      <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-slate-200/20 to-transparent pointer-events-none print:hidden" />
    </div>
  );
};