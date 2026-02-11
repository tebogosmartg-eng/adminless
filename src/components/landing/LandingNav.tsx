"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/source bucket/AdminLess logo.png";

export const LandingNav = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md no-print">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-4 group transition-all hover:scale-105 active:scale-95">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <img src={logo} alt="AdminLess Logo" className="h-10 w-10 object-contain" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">AdminLess</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden sm:block">
            <Button 
              variant="ghost" 
              className="text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              Teacher Login
            </Button>
          </Link>
          <Link to="/pilot-signup">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-500/20 px-6 h-11 rounded-xl active:scale-95 transition-all">
              Get Started
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