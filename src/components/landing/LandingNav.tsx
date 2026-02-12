"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import icon from "@/source bucket/ICON.png";

export const LandingNav = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md no-print">
      <div className="container mx-auto flex h-24 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3 group transition-opacity hover:opacity-90">
          <img 
            src={icon} 
            alt="AdminLess Icon" 
            className="h-16 w-auto object-contain" 
          />
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">AdminLess</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button 
              variant="ghost" 
              className="text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              Teacher Login
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-500/20 px-8 h-12 rounded-2xl active:scale-95 transition-all">
              Launch Workspace
            </Button>
          </Link>
          <div className="pl-2 border-l ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};