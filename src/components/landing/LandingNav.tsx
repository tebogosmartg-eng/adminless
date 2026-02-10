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
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">AdminLess</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-sm font-medium">Teacher Login</Button>
          </Link>
          <Link to="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6">Get Started</Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};