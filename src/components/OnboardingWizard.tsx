"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { useClasses } from "@/context/ClassesContext";
import { Rocket, School, Calendar, Users, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export const OnboardingWizard = ({ onComplete }: { onComplete: () => void }) => {
    const { teacherName, schoolName, updateProfileSettings } = useSettings();
    const { years, createYear, activeYear, activeTerm } = useAcademic();
    const { addClass } = useClasses();

    const [step, setStep] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    // Step 1: Profile
    const [tName, setTName] = useState(teacherName || "");
    const [sName, setSName] = useState(schoolName === "My School" ? "" : (schoolName || ""));

    // Step 2: Academic Setup
    const [yName, setYName] = useState(new Date().getFullYear().toString());

    // Step 3: First Class
    const [grade, setGrade] = useState("");
    const [subject, setSubject] = useState("");
    const [cName, setCName] = useState("");

    const handleNext = async () => {
        setIsProcessing(true);
        try {
            if (step === 1) {
                if (!tName.trim()) return;
                await updateProfileSettings({ teacherName: tName.trim(), schoolName: sName.trim() });
                
                // Skip year creation if they already have one
                if (years.length > 0) {
                    setStep(3);
                } else {
                    setStep(2);
                }
            } else if (step === 2) {
                if (!yName.trim()) return;
                await createYear(yName.trim());
                
                // Wait briefly for local database to react and select the activeYear and activeTerm
                setTimeout(() => {
                    setStep(3);
                    setIsProcessing(false);
                }, 1500);
                return; // Return early to keep processing state during timeout
                
            } else if (step === 3) {
                if (activeYear && activeTerm && cName.trim()) {
                    await addClass({
                        id: crypto.randomUUID(),
                        year_id: activeYear.id,
                        term_id: activeTerm.id,
                        grade: grade.trim() || "General",
                        subject: subject.trim() || "General",
                        className: cName.trim(),
                        learners: [],
                        archived: false,
                        is_finalised: false,
                        notes: "Created during onboarding"
                    });
                }
                setStep(4);
            } else if (step === 4) {
                await updateProfileSettings({ onboardingCompleted: true });
                onComplete();
            }
        } catch (error) {
            console.error("Onboarding error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card className="w-full max-w-lg shadow-2xl border-primary/20 animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center pb-8 pt-10 bg-muted/30 border-b">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    {step === 1 && <School className="h-8 w-8 text-primary" />}
                    {step === 2 && <Calendar className="h-8 w-8 text-primary" />}
                    {step === 3 && <Users className="h-8 w-8 text-primary" />}
                    {step === 4 && <Rocket className="h-8 w-8 text-primary" />}
                </div>
                <CardTitle className="text-2xl font-black text-primary">
                    {step === 1 && "Welcome to AdminLess"}
                    {step === 2 && "Academic Calendar"}
                    {step === 3 && "Create Your First Class"}
                    {step === 4 && "You're All Set!"}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                    {step === 1 && "Let's start by setting up your professional profile."}
                    {step === 2 && "Initialize the current academic year to organize your data."}
                    {step === 3 && "Set up a class roster container for this term."}
                    {step === 4 && "Your workspace is ready. You can now add learners and capture marks."}
                </CardDescription>
            </CardHeader>
            
            <CardContent className="p-8">
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="tName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Name</Label>
                            <Input 
                                id="tName" 
                                placeholder="e.g. Mr. Smith" 
                                value={tName} 
                                onChange={(e) => setTName(e.target.value)}
                                className="h-12"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="sName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">School Name</Label>
                            <Input 
                                id="sName" 
                                placeholder="e.g. Sunnydale High" 
                                value={sName} 
                                onChange={(e) => setSName(e.target.value)}
                                className="h-12"
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            AdminLess automatically organizes your work into 4 terms. What year are we setting up?
                        </p>
                        <div className="space-y-3">
                            <Label htmlFor="yName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Academic Year</Label>
                            <Input 
                                id="yName" 
                                placeholder="e.g. 2024" 
                                value={yName} 
                                onChange={(e) => setYName(e.target.value)}
                                className="h-14 text-center text-xl font-black w-1/2 mx-auto"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <Label htmlFor="grade" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grade</Label>
                                <Input id="grade" placeholder="e.g. Grade 10" value={grade} onChange={(e) => setGrade(e.target.value)} className="h-12" autoFocus />
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                                <Input id="subject" placeholder="e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-12" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="cName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Class Name</Label>
                            <Input id="cName" placeholder="e.g. 10A" value={cName} onChange={(e) => setCName(e.target.value)} className="h-12" />
                        </div>
                        
                        {(!activeYear || !activeTerm) && (
                            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                Finishing academic setup... Please wait a moment.
                            </p>
                        )}
                    </div>
                )}

                {step === 4 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Setup Complete!</h3>
                        <p className="text-sm text-slate-500">
                            Your baseline context is established. You can always change these details in Settings.
                        </p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-8 pt-0 border-t mt-4 bg-muted/10">
                <div className="flex flex-col w-full gap-2 mt-4">
                    <Button 
                        className="w-full h-12 font-bold text-base" 
                        onClick={handleNext} 
                        disabled={
                            isProcessing || 
                            (step === 1 && !tName.trim()) || 
                            (step === 2 && !yName.trim()) || 
                            (step === 3 && (!cName.trim() || !activeYear || !activeTerm))
                        }
                    >
                        {isProcessing ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Please wait...</>
                        ) : step === 4 ? (
                            "Go to Dashboard"
                        ) : (
                            <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full text-muted-foreground" 
                        onClick={async () => {
                            await updateProfileSettings({ onboardingCompleted: true });
                            onComplete();
                        }}
                        disabled={isProcessing}
                    >
                        Skip Setup
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};