import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "./ThemeToggle";
import MobileSidebar from "./MobileSidebar";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { HelpDialog } from "./HelpDialog";

const Header = () => {
  const { teacherName } = useSettings();

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
      
      {/* Global Search Trigger - Visible on desktop centered/left, or icon on mobile */}
      <div className="flex-1 flex justify-center md:justify-start px-4">
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