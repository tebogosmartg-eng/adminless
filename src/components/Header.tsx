import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import MobileSidebar from "./MobileSidebar";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, ChevronDown, Check, Clock, AlertTriangle, BookMarked } from "lucide-react";
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
import { useCurrentPeriod } from "@/hooks/useCurrentPeriod";
import { showSuccess } from "@/utils/toast";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import { Link } from "react-router-dom";

const Header = () => {
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
    
    if (confirm(`Switch working academic cycle to ${year.name}? This will update the context for your entire dashboard.`)) {
        setActiveYear(year);
        showSuccess(`Switched to ${year.name}`);
    }
  };

  const handleTermSwitch = (term: any) => {
    if (term.id === activeTerm?.id) return;

    if (confirm(`Switch active term to ${term.name}?`)) {
        setActiveTerm(term);
        showSuccess(`Switched to ${term.name}`);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-blue-700 dark:bg-blue-950 px-4 md:px-8 no-print shadow-md z-30 transition-all duration-300 text-white border-blue-800">
      <div className="flex items-center gap-4 md:hidden">
        <MobileSidebar />
      </div>
      
      <div className="flex-1 flex justify-center md:justify-start items-center gap-4">
        <div className="relative group">
            <Button 
            variant="outline" 
            className="h-9 w-full md:w-64 justify-start text-xs text-white/80 bg-blue-800/40 hover:bg-blue-800/60 border-blue-600/50 group-hover:border-blue-500 transition-all"
            onClick={triggerSearch}
            >
            <Search className="mr-2 h-3.5 w-3.5 text-white/70" />
            <span className="hidden lg:inline-flex">Search students...</span>
            <span className="inline-flex lg:hidden">Search...</span>
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border border-blue-600 bg-blue-800/50 px-1.5 font-mono text-[9px] font-medium text-white/50 sm:flex">
                <span className="text-[10px]">⌘</span>K
            </kbd>
            </Button>
        </div>

        {currentPeriod && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 animate-in slide-in-from-top-1">
                <BookMarked className="h-3.5 w-3.5 text-blue-200" />
                <span className="text-[9px] font-black uppercase tracking-tight text-blue-100">
                    Teaching Session {currentPeriod.period}
                </span>
                <span className="w-1 h-1 rounded-full bg-blue-300" />
                <span className="text-[10px] font-bold truncate max-w-[120px]">{currentPeriod.class_name}</span>
            </div>
        )}

        <div className="hidden xl:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-3 gap-2 font-normal text-white/80 hover:bg-white/10 relative">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider font-bold text-white">{activeYear?.name || "Select Year"}</span>
                  <span className="text-xs font-medium text-white/70">{activeTerm?.name || "Select Term"}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                  
                  {!isReadyForFinalization && activeYear && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Manual Context Switch</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {terms.length > 0 ? (
                    terms.map(term => (
                        <DropdownMenuItem key={term.id} onClick={() => handleTermSwitch(term)} className="justify-between text-sm py-2 cursor-pointer">
                            {term.name}
                            {activeTerm?.id === term.id && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                    ))
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
                
                {!isReadyForFinalization && activeYear && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-2">
                            <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-black uppercase text-amber-600 border-amber-200 bg-amber-50" asChild>
                                <Link to="/">Setup Incomplete</Link>
                            </Button>
                        </div>
                    </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <HelpDialog />
        <ThemeToggle />
        <div className="flex items-center gap-3 pl-2 border-l border-white/20 ml-1">
          <span className="text-[11px] font-bold uppercase tracking-widest hidden md:block text-white/90">
            {teacherName || "Teacher"}
          </span>
          <Avatar className="h-8 w-8 ring-2 ring-white/20">
            <AvatarFallback className="bg-white/10 text-white text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;