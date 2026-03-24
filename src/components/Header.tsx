import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import MobileSidebar from "./MobileSidebar";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, ChevronDown, Check, Clock, AlertTriangle, BookMarked, LogOut, Settings, Lock, CheckCircle2 } from "lucide-react";
import { HelpDialog } from "./HelpDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { showSuccess, showError } from "@/utils/toast";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const Header = () => {
  const navigate = useNavigate();
  const { teacherName } = useSettings();
  const { years, activeYear, setActiveYear, terms, activeTerm, setActiveTerm } = useAcademic();
  const { currentPeriod } = useCurrentPeriod();
  const { isReadyForFinalization } = useSetupStatus();

  const initials = teacherName
    ? teacherName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : "T";

  const triggerSearch = () => {
    window.dispatchEvent(new Event("open-command-search"));
  };

  const handleYearSwitch = (year: any) => {
    if (year.id === activeYear?.id) return;
    
    if (confirm(`Switch to ${year.name}? This will update your entire dashboard context.`)) {
        setActiveYear(year);
        showSuccess(`Switched to ${year.name}`);
    }
  };

  const handleTermSwitch = (term: any) => {
    if (term.id === activeTerm?.id) return;
    setActiveTerm(term);
  };

  const handleLogout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showSuccess("Signed out successfully");
        navigate("/welcome");
    } catch (err: any) {
        showError(err.message || "Failed to sign out.");
    }
  };

  const sortedTerms = [...terms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return (
    <header className="flex h-16 items-center justify-between border-b bg-blue-700 dark:bg-blue-950 px-3 md:px-8 no-print shadow-md z-30 transition-all duration-300 text-white border-blue-800">
      <div className="flex items-center gap-2 md:hidden">
        <MobileSidebar />
      </div>
      
      <div className="flex-1 flex justify-start md:justify-start items-center gap-2 md:gap-4 pl-2 md:pl-0 min-w-0">
        <div className="relative group flex-1 md:flex-none">
            <Button 
            variant="outline" 
            className="h-9 w-full md:w-64 justify-start text-xs text-white/80 bg-blue-800/40 hover:bg-blue-800/60 border-blue-600/50 group-hover:border-blue-500 transition-all px-2 md:px-4"
            onClick={triggerSearch}
            >
            <Search className="md:mr-2 h-3.5 w-3.5 text-white/70" />
            <span className="hidden lg:inline-flex">Search learners...</span>
            <span className="hidden sm:inline-flex lg:hidden">Search...</span>
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border border-blue-600 bg-blue-800/50 px-1.5 font-mono text-[9px] font-medium text-white/50 sm:flex">
                <span className="text-[10px]">⌘</span>K
            </kbd>
            </Button>
        </div>

        {currentPeriod && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 animate-in slide-in-from-top-1">
                <BookMarked className="h-3.5 w-3.5 text-blue-200" />
                <span className="text-[9px] font-black uppercase tracking-tight text-blue-100">
                    Session {currentPeriod.period}
                </span>
                <span className="w-1 h-1 rounded-full bg-blue-300" />
                <span className="text-[10px] font-bold truncate max-w-[120px]">{currentPeriod.class_name}</span>
            </div>
        )}

        <div className="hidden sm:flex xl:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 md:px-3 gap-1 md:gap-2 font-normal text-white/80 hover:bg-white/10 relative">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-white hidden md:inline-block">{activeYear?.name || "Year"}</span>
                  <span className="text-[10px] md:text-xs font-medium text-white/70">{activeTerm?.name || "Term"}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Academic Progression</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortedTerms.length > 0 ? (
                    sortedTerms.map((term, index, array) => {
                        const isFinalised = term.is_finalised;
                        const isPrevFinalised = index === 0 || array[index - 1].is_finalised;
                        const isCurrentActive = activeTerm?.id === term.id;
                        
                        // Strict progression: Only unlocked if previous is finalised or it is the first term
                        const isUnlocked = isPrevFinalised;
                        
                        return (
                            <TooltipProvider key={term.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="w-full">
                                            <DropdownMenuItem 
                                                onClick={() => isUnlocked && handleTermSwitch(term)} 
                                                className={cn(
                                                    "justify-between text-sm py-2.5 px-3",
                                                    !isUnlocked ? "opacity-50 cursor-not-allowed bg-muted/5" : "cursor-pointer",
                                                    isCurrentActive && "bg-primary/5 font-bold border-l-2 border-primary"
                                                )}
                                                disabled={!isUnlocked}
                                            >
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(isCurrentActive ? "text-primary" : "text-foreground")}>{term.name}</span>
                                                        {!isUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                                        {isFinalised && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase text-muted-foreground">
                                                        {isCurrentActive ? "Currently Working" : isFinalised ? "Historical Record" : isUnlocked ? "Unlocked" : `Locked until ${array[index-1].name} finalised`}
                                                    </span>
                                                </div>
                                                {isCurrentActive && <Check className="h-4 w-4 text-primary" />}
                                            </DropdownMenuItem>
                                        </div>
                                    </TooltipTrigger>
                                    {!isUnlocked && (
                                        <TooltipContent side="right">
                                            <p className="text-xs">Finalise {array[index-1].name} to unlock this term.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        )
                    })
                ) : (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground italic">
                        Select a year first
                    </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-sm py-2">Switch Academic Cycle</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {years.map(year => (
                      <DropdownMenuItem key={year.id} onClick={() => handleYearSwitch(year)} className="justify-between text-sm py-2 cursor-pointer">
                        {year.name} {year.closed ? "(Finalized)" : ""}
                        {activeYear?.id === year.id && <Check className="h-4 w-4" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <HelpDialog />
        <div className="hidden sm:block"><ThemeToggle /></div>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 md:gap-3 pl-1 sm:pl-2 border-l border-white/20 ml-1 hover:bg-white/5 transition-colors p-1 rounded-md outline-none">
                    <span className="text-[11px] font-bold uppercase tracking-widest hidden md:block text-white/90">
                        {teacherName || "Teacher"}
                    </span>
                    <Avatar className="h-7 w-7 md:h-8 md:w-8 ring-2 ring-white/20">
                        <AvatarFallback className="bg-white/10 text-white text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <div className="sm:hidden">
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                    <div className="px-2 py-1"><ThemeToggle /></div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;