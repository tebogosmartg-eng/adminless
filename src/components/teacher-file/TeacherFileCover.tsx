"use client";

import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { AcademicYear } from '@/lib/types';
import icon from "@/source bucket/ICON.png";
import { ShieldCheck, User, School } from 'lucide-react';

export const TeacherFileCover = ({ year }: { year: AcademicYear | null }) => {
  const { schoolName, teacherName, schoolLogo } = useSettings();

  return (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-12 py-20">
      <div className="space-y-4">
        {schoolLogo ? (
            <img src={schoolLogo} alt="School Logo" className="h-32 w-32 mx-auto object-contain mb-8" />
        ) : (
            <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <School className="h-12 w-12 text-blue-600" />
            </div>
        )}
        <h1 className="text-4xl font-black tracking-tight text-slate-900">{schoolName}</h1>
      </div>

      <div className="w-24 h-1 bg-blue-600 rounded-full" />

      <div className="space-y-2">
        <h2 className="text-6xl font-black tracking-tighter text-slate-900">TEACHER FILE</h2>
        <p className="text-xl font-bold text-blue-600 uppercase tracking-[0.3em]">{year?.name || '2024'}</p>
      </div>

      <div className="grid grid-cols-2 gap-12 pt-12 border-t border-slate-100 w-full max-w-md mx-auto">
        <div className="text-left space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Educator</span>
            <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                {teacherName || "Professional Educator"}
            </p>
        </div>
        <div className="text-right space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</span>
            <p className="text-lg font-bold text-green-600 flex items-center justify-end gap-2">
                <ShieldCheck className="h-4 w-4" />
                Validated
            </p>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-center gap-3 opacity-30 grayscale">
            <img src={icon} alt="AdminLess" className="h-12 w-auto" />
            <span className="text-xl font-black tracking-tighter">AdminLess</span>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            Generated Digital Portfolio • Academic Compliance Module
        </p>
      </div>
    </div>
  );
};