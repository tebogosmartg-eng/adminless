"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';

const pilotSchema = z.object({
  fullName: z.string().min(3, "Please enter your full name"),
  email: z.string().email("Please enter a valid work email"),
  schoolName: z.string().min(3, "Please enter your school's name"),
  role: z.string().min(1, "Please select your role"),
  grades: z.array(z.string()).min(1, "Select at least one grade"),
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
  source: z.string().optional()
});

type PilotFormValues = z.infer<typeof pilotSchema>;

const SA_GRADES = ["Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const SA_SUBJECTS = ["Mathematics", "Math Literacy", "Physical Sciences", "Life Sciences", "English HL", "English FAL", "Accounting", "History", "Geography", "EMS", "Natural Sciences"];

export const PilotSignupForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PilotFormValues>({
    resolver: zodResolver(pilotSchema),
    defaultValues: {
      grades: [],
      subjects: []
    }
  });

  const selectedGrades = watch("grades");
  const selectedSubjects = watch("subjects");

  const toggleItem = (field: "grades" | "subjects", value: string) => {
    const current = watch(field);
    const updated = current.includes(value) 
        ? current.filter(item => item !== value) 
        : [...current, value];
    setValue(field, updated, { shouldValidate: true });
  };

  const onSubmit = async (values: PilotFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: values.fullName,
            school_name: values.schoolName,
            role: values.role,
            grades: values.grades,
            subjects: values.subjects,
            marketing_source: values.source
          }
        }
      });

      if (error) throw error;
      
      setIsSuccess(true);
      showSuccess("Magic link sent!");
    } catch (err: any) {
      showError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold">Check your inbox</h2>
            <p className="text-slate-500 max-w-sm">
                We've sent a secure magic link to <span className="font-bold text-slate-900">{watch("email")}</span>. 
                Click the button in the email to start your pilot.
            </p>
        </div>
        <Button variant="outline" onClick={() => setIsSuccess(false)}>
            Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-[11px] uppercase font-black tracking-widest text-slate-400">Full Name</Label>
          <Input id="fullName" placeholder="e.g. David Smith" {...register("fullName")} className={errors.fullName ? "border-red-500" : ""} />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[11px] uppercase font-black tracking-widest text-slate-400">Work Email</Label>
          <Input id="email" type="email" placeholder="name@school.ac.za" {...register("email")} className={errors.email ? "border-red-500" : ""} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="schoolName" className="text-[11px] uppercase font-black tracking-widest text-slate-400">School Name</Label>
          <Input id="schoolName" placeholder="e.g. Sunnydale High" {...register("schoolName")} className={errors.schoolName ? "border-red-500" : ""} />
          {errors.schoolName && <p className="text-xs text-red-500 mt-1">{errors.schoolName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-[11px] uppercase font-black tracking-widest text-slate-400">Your Role</Label>
          <Select onValueChange={(val) => setValue("role", val, { shouldValidate: true })}>
            <SelectTrigger className={errors.role ? "border-red-500" : ""}>
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Teacher">Teacher</SelectItem>
              <SelectItem value="HOD">HOD / Subject Head</SelectItem>
              <SelectItem value="Administrator">Administrator</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Grades Taught</Label>
            <span className="text-[10px] font-bold text-blue-600">{selectedGrades.length} selected</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SA_GRADES.map(grade => (
                <button
                    key={grade}
                    type="button"
                    onClick={() => toggleItem("grades", grade)}
                    className={`text-xs p-2 rounded-lg border text-left transition-all ${
                        selectedGrades.includes(grade) 
                            ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" 
                            : "bg-slate-50 hover:bg-slate-100 border-transparent text-slate-600"
                    }`}
                >
                    {grade}
                </button>
            ))}
          </div>
          {errors.grades && <p className="text-xs text-red-500">{errors.grades.message}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Subjects Taught</Label>
            <span className="text-[10px] font-bold text-blue-600">{selectedSubjects.length} selected</span>
          </div>
          <ScrollArea className="h-[120px] rounded-lg border bg-slate-50 p-2">
            <div className="grid gap-2">
                {SA_SUBJECTS.map(subject => (
                    <div key={subject} className="flex items-center space-x-2">
                        <Checkbox 
                            id={`sub-${subject}`} 
                            checked={selectedSubjects.includes(subject)} 
                            onCheckedChange={() => toggleItem("subjects", subject)}
                        />
                        <label htmlFor={`sub-${subject}`} className="text-xs font-medium text-slate-700 cursor-pointer">{subject}</label>
                    </div>
                ))}
            </div>
          </ScrollArea>
          {errors.subjects && <p className="text-xs text-red-500">{errors.subjects.message}</p>}
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <Label htmlFor="source" className="text-[11px] uppercase font-black tracking-widest text-slate-400">How did you hear about us? (Optional)</Label>
        <Input id="source" placeholder="e.g. WhatsApp, Colleague, Facebook..." {...register("source")} />
      </div>

      <div className="pt-6">
        <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-14 text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
        >
            {isSubmitting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Magic Link...</>
            ) : (
                <><Send className="mr-2 h-5 w-5" /> Start Free Teacher Pilot</>
            )}
        </Button>
        <p className="text-center text-[10px] text-slate-400 mt-4 italic">
            "Your data stays yours. No spam. No automatic submissions."
        </p>
      </div>
    </form>
  );
};