import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import MobileSidebar from "./MobileSidebar";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, ChevronDown, Check } from "lucide-react";
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

const Header = () => {
  const { teacherName } = useSettings();
  const { years, activeYear, setActiveYear, terms, activeTerm, setActiveTerm } = useAcademic();

  const initials = teacherName
    ? teacherName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
    : "T";

  const triggerSearch = () => {
    window.dispatchEvent(new Event("open-command-search"));
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-orange-700 dark:bg-orange-950 px-4 md:px-8 no-print shadow-md z-30 transition-all duration-300 text-white border-orange-800">
      <div className="flex items-center gap-4 md:hidden">
        <MobileSidebar />
      </div>
      
      <div className="flex-1 flex justify-center md:justify-start items-center gap-4">
        <div className="relative group">
            <Button 
            variant="outline" 
            className="h-9 w-full md:w-72 justify-start text-xs text-white/80 bg-orange-800/40 hover:bg-orange-800/60 border-orange-600/50 group-hover:border-orange-500 transition-all"
            onClick={triggerSearch}
            >
            <Search className="mr-2 h-3.5 w-3.5 text-white/70" />
            <span className="hidden lg:inline-flex">Find a learner...</span>
            <span className="inline-flex lg:hidden">Search...</span>
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border border-orange-600 bg-orange-800/50 px-1.5 font-mono text-[9px] font-medium text-white/50 sm:flex">
                <span className="text-[10px]">⌘</span>K
            </kbd>
            </Button>
        </div>

        {activeYear && (
            <div className="hidden lg:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 px-3 gap-2 font-normal text-white/80 hover:bg-white/10">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wider font-bold text-white">{activeYear.name}</span>
                      <span className="w-px h-3 bg-white/20 mx-1"></span>
                      <span className="text-xs font-medium text-white/90">{activeTerm?.name || "No Term"}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Active Term</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {terms.map(term => (
                      <DropdownMenuItem key={term.id} onClick={() => setActiveTerm(term)} className="justify-between text-sm py-2">
                        {term.name}
                        {activeTerm?.id === term.id && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-sm py-2">Switch Academic Year</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {years.map(year => (
                          <DropdownMenuItem key={year.id} onClick={() => setActiveYear(year)} className="justify-between text-sm py-2">
                            {year.name} {year.closed && "(Closed)"}
                            {activeYear.id === year.id && <Check className="h-4 w-4" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-white/80 hover:text-white transition-colors">
            <HelpDialog />
        </div>
        <div className="text-white/80 hover:text-white transition-colors">
            <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 pl-2 border-l border-white/20 ml-1">
          {teacherName && (
            <span className="text-[11px] font-bold uppercase tracking-widest hidden md:block text-white/90">
              {teacherName}
            </span>
          )}
          <Avatar className="h-8 w-8 ring-2 ring-white/20">
            <AvatarImage src="" alt={teacherName || "Teacher"} />
            <AvatarFallback className="bg-white/10 text-white text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;