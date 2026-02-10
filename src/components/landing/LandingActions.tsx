"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Sparkles, Mail, Send, CheckCircle2 } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

export const DemoRequestDialog = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess("Demo request received! Our team will contact you shortly.");
    setOpen(false);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center text-xl">Book a Live Demo</DialogTitle>
          <DialogDescription className="text-center">
            See how AdminLess can transform your school's productivity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="teacher@school.ac.za" 
                className="pl-10" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <Send className="mr-2 h-4 w-4" /> Request Demo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const DataCommitmentDialog = ({ children }: { children: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Trust & Transparency</span>
          </div>
          <DialogTitle className="text-2xl font-bold">Our Data & AI Commitment</DialogTitle>
          <DialogDescription>
            How we protect educator privacy and student information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <h4 className="font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Teachers Stay in Control
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We never run automation that changes your marks without your consent. All AI features (scanning, insights, comments) are assistive and require teacher review and confirmation.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Zero Data Selling
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AdminLess is not supported by ads. We do not sell student or teacher data to third-party advertisers. Your classroom is a private workspace.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Local Compliance
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our export formats are strictly aligned with South African school requirements, ensuring that the transition from AdminLess to official systems like SA-SAMS is seamless and secure.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={() => window.open('#', '_blank')}>
            Download Full Privacy Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};