"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const LandingNav = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-black/80 backdrop-blur-md no-print">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
              <ShieldCheck className="h-6 w-6 text-white" />
          </div>
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