"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import icon from "@/source bucket/ICON.png";

export const LandingNav = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md no-print">
      <div className="container mx-auto flex min-h-[6rem] flex-wrap items-center justify-between px-4 py-3 md:px-8 gap-y-4">
        <Link to="/" className="flex items-center gap-2 md:gap-3 group transition-opacity hover:opacity-90 min-w-0 max-w-[50%] md:max-w-none">
          <img
            src={icon}
            alt="AdminLess Icon"
            className="h-10 md:h-16 w-auto object-contain flex-shrink-0"
          />
          <span className="text-lg md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white truncate">AdminLess</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-4 flex-1">
          <Link to="/login" className="hidden sm:inline-block">
            <Button
              variant="ghost"
              className="text-xs md:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              Teacher Login
            </Button>
          </Link>
          <Link to="/login" className="flex-shrink-0">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 px-4 md:px-8 h-10 md:h-12 rounded-xl md:rounded-2xl active:scale-95 transition-all text-xs md:text-sm whitespace-nowrap">
              Launch Workspace
            </Button>
          </Link>
          <div className="pl-2 border-l ml-1 md:ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};