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
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:justify-end md:px-6 no-print">
      <div className="flex items-center gap-4 md:hidden">
        <MobileSidebar />
      </div>
      
      {/* Global Search Trigger */}
      <div className="flex-1 flex justify-center md:justify-start px-4 items-center gap-4">
        <Button 
          variant="outline" 
          className="relative h-9 w-full md:w-64 justify-start text-sm text-muted-foreground sm:pr-12 bg-muted/50 hover:bg-muted"
          onClick={triggerSearch}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden lg:inline-flex">Search students...</span>
          <span className="inline-flex lg:hidden">Search...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {activeYear && (
            <div className="hidden lg:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 px-3 gap-2 bg-background font-normal text-muted-foreground border-dashed hover:text-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{activeYear.name}</span>
                      <span className="w-px h-3 bg-border mx-1"></span>
                      <span className="text-foreground font-medium">{activeTerm?.name || "No Term"}</span>
                      <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>Active Term</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {terms.map(term => (
                      <DropdownMenuItem key={term.id} onClick={() => setActiveTerm(term)} className="justify-between">
                        {term.name}
                        {activeTerm?.id === term.id && <Check className="h-4 w-4" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Switch Year</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {years.map(year => (
                          <DropdownMenuItem key={year.id} onClick={() => setActiveYear(year)} className="justify-between">
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

      <div className="flex items-center gap-2 sm:gap-4">
        <HelpDialog />
        <ThemeToggle />
        <div className="flex items-center gap-2">
          {teacherName && (
            <span className="text-sm font-medium hidden md:block text-muted-foreground">
              {teacherName}
            </span>
          )}
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt={teacherName || "Teacher"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;