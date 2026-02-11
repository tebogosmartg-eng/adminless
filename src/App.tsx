"use client";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassDetails from "./pages/ClassDetails";
import Scan from "./pages/Scan";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import EvidenceAudit from "./pages/EvidenceAudit";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import PilotSignup from "./pages/PilotSignup";
import { ClassesProvider } from "./context/ClassesContext";
import { ActivityProvider } from "./context/ActivityContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./context/SettingsContext";
import { AcademicProvider } from "./context/AcademicContext";
import { SyncProvider } from "./context/SyncContext";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { SystemThemeManager } from "./components/SystemThemeManager";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, session }: { children: React.ReactNode; session: Session | null }) => {
  if (!session) {
    return <Navigate to="/welcome" replace />;
  }
  return <>{children}</>;
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(initialSession);
      } catch (err) {
        console.error("[auth] Initial session load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
           <div className="relative">
             <div className="h-16 w-16 rounded-full border-4 border-primary/30" />
             <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
           </div>
           <p className="text-muted-foreground font-medium animate-pulse">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" storageKey="adminless-theme">
        <TooltipProvider>
          <SystemThemeManager />
          <Toaster />
          <Sonner />
          <SyncProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AcademicProvider session={session}>
                    <ActivityProvider session={session}>
                        <SettingsProvider session={session}>
                            <ClassesProvider session={session}>
                                <OfflineIndicator />
                                <Routes>
                                <Route path="/welcome" element={session ? <Navigate to="/" /> : <Landing />} />
                                <Route path="/pilot-signup" element={session ? <Navigate to="/" /> : <PilotSignup />} />
                                <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
                                <Route
                                    element={
                                    <ProtectedRoute session={session}>
                                        <Layout />
                                    </ProtectedRoute>
                                    }
                                >
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/classes" element={<Classes />} />
                                    <Route path="/classes/:classId" element={<ClassDetails />} />
                                    <Route path="/scan" element={<Scan />} />
                                    <Route path="/reports" element={<Reports />} />
                                    <Route path="/evidence-audit" element={<EvidenceAudit />} />
                                    <Route path="/settings" element={<Settings />} />
                                </Route>
                                <Route path="*" element={<Navigate to="/" />} />
                                </Routes>
                            </ClassesProvider>
                        </SettingsProvider>
                    </ActivityProvider>
                </AcademicProvider>
            </BrowserRouter>
          </SyncProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;