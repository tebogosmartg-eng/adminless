"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/source bucket/AdminLess logo.png";

export const LandingNav = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md no-print">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3 group transition-opacity hover:opacity-90">
          <img src={logo} alt="AdminLess Logo" className="h-8 w-8 rounded-lg shadow-sm group-hover:shadow-md transition-all object-contain" />
          <span className="text-xl font-bold tracking-tight">AdminLess</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button 
              variant="ghost" 
              className="text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Teacher Login
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md px-6 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-blue-400">
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