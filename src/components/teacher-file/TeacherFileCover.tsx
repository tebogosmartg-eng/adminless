"use client";

import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { AcademicYear } from '@/lib/types';
import icon from "@/source bucket/ICON.png";
import { ShieldCheck, User, Mail, Phone } from 'lucide-react';
import { TeacherFileAnnotation } from './TeacherFileAnnotation';

export const TeacherFileCover = ({ year }: { year: AcademicYear | null }) => {
  const { teacherName, contactEmail, contactPhone } = useSettings();

  return (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-12 py-20">
      <div className="space-y-4">
        <div className="w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-200">
            <img src={icon} alt="AdminLess" className="h-16 w-auto invert brightness-0" />
        </div>
        <h1 className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-600">Administrative Portfolio</h1>
      </div>

      <div className="space-y-2">
        <h2 className="text-7xl font-black tracking-tighter text-slate-900">TEACHER FILE</h2>
        <p className="text-2xl font-bold text-slate-400 uppercase tracking-[0.2em]">{year?.name || 'Academic Cycle'}</p>
      </div>

      <div className="w-full max-w-lg mt-8">
          <TeacherFileAnnotation 
            yearId={year?.id} 
            sectionKey="cover.reflection" 
            label="Introductory Notes"
            placeholder="Academic reflection or message to moderators..."
            isLocked={year?.closed}
          />
      </div>

      <div className="w-full max-w-md mx-auto pt-12 border-t-2 border-slate-900 space-y-6">
        <div className="space-y-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Teacher / Professional Profile</span>
            <p className="text-2xl font-black text-slate-900 truncate">
                {teacherName || "Professional Educator"}
            </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="text-left space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                    <Mail className="h-2.5 w-2.5" /> Email
                </span>
                <p className="text-xs font-bold text-slate-700 truncate">{contactEmail || "Not available in Profile"}</p>
            </div>
            <div className="text-right space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-end gap-1">
                    <Phone className="h-2.5 w-2.5" /> Contact
                </span>
                <p className="text-xs font-bold text-slate-700 truncate">{contactPhone || "Not available in Profile"}</p>
            </div>
        </div>
      </div>

      <div className="mt-auto pt-10">
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border bg-slate-50">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                Authenticated Digital Record • CAPS COMPLIANT
            </span>
        </div>
      </div>
    </div>
  );
};