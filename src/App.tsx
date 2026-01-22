import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassDetails from "./pages/ClassDetails";
import Scan from "./pages/Scan";
import Settings from "./pages/Settings";
import { ClassesProvider } from "./context/ClassesContext";
import { ActivityProvider } from "./context/ActivityContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsProvider } from "./context/SettingsContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="smareg-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ActivityProvider>
          <SettingsProvider>
            <ClassesProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/classes/:classId" element={<ClassDetails />} />
                    <Route path="/scan" element={<Scan />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ClassesProvider>
          </SettingsProvider>
        </ActivityProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;