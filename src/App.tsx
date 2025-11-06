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
import { ClassesProvider } from "./context/ClassesContext";
import { ActivityProvider } from "./context/ActivityContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ActivityProvider>
        <ClassesProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />} >
                <Route path="/" element={<Dashboard />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/classes/:classId" element={<ClassDetails />} />
                <Route path="/scan" element={<Scan />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ClassesProvider>
      </ActivityProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;